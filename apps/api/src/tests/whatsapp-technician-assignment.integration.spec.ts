import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, ensureDatabaseInitialized, closeDatabaseConnections } from '../database/client';
import { normalizeWhatsAppPhone } from '../modules/whatsapp/whatsapp-phone.util';
import { whatsappService } from '../modules/whatsapp/whatsapp.service';
import { jobCardsService } from '../modules/job-cards/job-cards.service';
import { jobCardsRepository } from '../modules/job-cards/job-cards.repository';
import { servicesRepository } from '../modules/services/services.repository';
import { customers, customerAssets, products, services, jobCards, technicians, whatsappMessages } from '../database/schema/index';
import { eq, desc } from 'drizzle-orm';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';

import { getRedisClient } from '../redis/client';
import { createSession } from '../security/session';

describe('WhatsApp Technician Assignment Notification System (End-to-End)', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    await ensureDatabaseInitialized();
    app = await buildApp();
    await app.ready();

    // Generate authenticated admin test session
    const redis = getRedisClient();
    const session = await createSession(redis, {
      userId: '00000000-0000-0000-0000-000000000001',
      username: 'admin@srenterprises.com',
      displayName: 'Super Admin',
      role: 'Super Admin',
    });
    adminToken = session.sessionId;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabaseConnections();
  });

  // =========================================================================
  // 1. Phone Number Normalization Tests
  // =========================================================================
  describe('1. Phone Number Normalization Utility', () => {
    it('should format 10-digit Indian numbers to 91XXXXXXXXXX', () => {
      expect(normalizeWhatsAppPhone('9820011223')).toBe('919820011223');
      expect(normalizeWhatsAppPhone('9021653893')).toBe('919021653893');
    });

    it('should handle +91 prefix and spaces/dashes without double 91', () => {
      expect(normalizeWhatsAppPhone('+919820011223')).toBe('919820011223');
      expect(normalizeWhatsAppPhone('+91 98200 11223')).toBe('919820011223');
      expect(normalizeWhatsAppPhone('+91-90216-53893')).toBe('919021653893');
    });

    it('should handle numbers already starting with 91', () => {
      expect(normalizeWhatsAppPhone('919820011223')).toBe('919820011223');
    });

    it('should handle leading 0 or 091 prefix', () => {
      expect(normalizeWhatsAppPhone('09820011223')).toBe('919820011223');
      expect(normalizeWhatsAppPhone('0919820011223')).toBe('919820011223');
    });

    it('should return null for invalid, incomplete, or empty numbers', () => {
      expect(normalizeWhatsAppPhone('')).toBeNull();
      expect(normalizeWhatsAppPhone(null)).toBeNull();
      expect(normalizeWhatsAppPhone(undefined)).toBeNull();
      expect(normalizeWhatsAppPhone('12345')).toBeNull();
      expect(normalizeWhatsAppPhone('abc-def')).toBeNull();
    });
  });

  // =========================================================================
  // 2. Complete End-to-End Assignment Flow Tests
  // =========================================================================
  describe('2. Technician Assignment Notification End-to-End Flow', () => {
    let testCustomer: any;
    let testAsset: any;
    let testService: any;
    let testJobCard: any;
    let technicianA: any;
    let technicianB: any;

    beforeAll(async () => {
      // 1. Create or get active test customer
      const [cust] = await db
        .insert(customers)
        .values({
          customerNumber: `CUST-WA-${Date.now() % 100000}`,
          fullName: 'Kartik Pawase',
          phone: '9021653893',
          email: 'kartik.test@example.com',
          status: 'ACTIVE',
        })
        .returning();
      testCustomer = cust;

      // 2. Create product & customer asset
      const [prod] = await db
        .insert(products)
        .values({
          name: 'Livpure RO Water Purifier',
          sku: `LP-RO-${Date.now()}`,
          category: 'WATER_PURIFIER',
          productType: 'RO_MACHINE',
          brand: 'Livpure',
          model: 'Livpure Touch Plus',
          unitPrice: '18500',
          mrp: '22000',
          stockQuantity: 15,
          isActive: true,
        })
        .returning();

      const [asset] = await db
        .insert(customerAssets)
        .values({
          assetNumber: `AST-WA-${Date.now() % 100000}`,
          customerId: testCustomer.id,
          productId: prod.id,
          customName: 'Livpure Touch Plus 15 LPH',
          serialNumber: 'SN-RO-119099',
          assetType: 'RO_MACHINE',
          purchaseDate: new Date('2026-01-15'),
          status: 'ACTIVE',
        })
        .returning();
      testAsset = asset;

      // 3. Find or insert Technician A & Technician B
      let [tech1] = await db.select().from(technicians).where(eq(technicians.phone, '9820011223')).limit(1);
      if (!tech1) {
        const [newTech] = await db
          .insert(technicians)
          .values({
            fullName: 'Aakash Sharma',
            phone: '9820011223',
            email: 'aakash.sharma@srenterprises.com',
            status: 'ACTIVE',
            skills: ['RO Installation', 'Membrane Replacement', 'TDS Calibration'],
          })
          .returning();
        tech1 = newTech;
      }
      technicianA = tech1;

      let [tech2] = await db.select().from(technicians).where(eq(technicians.phone, '9840055667')).limit(1);
      if (!tech2) {
        const [newTech] = await db
          .insert(technicians)
          .values({
            fullName: 'Rohit Verma',
            phone: '9840055667',
            email: 'rohit.verma@srenterprises.com',
            status: 'ACTIVE',
            skills: ['Commercial RO', 'Electrical Troubleshooting'],
          })
          .returning();
        tech2 = newTech;
      }
      technicianB = tech2;

      // 4. Create Service Order & Job Card
      const srvResult = await servicesRepository.createService({
        customerId: testCustomer.id,
        assetId: testAsset.id,
        serviceType: 'PERIODIC_MAINTENANCE',
        serviceLocation: 'DOORSTEP',
        serviceClassification: 'WARRANTY',
        scheduledDate: '2026-10-03',
        scheduledTimeSlot: '10:00 AM - 12:00 PM',
        priority: 'HIGH',
        customerNotes: 'Water TDS issue, please check membrane and TDS level.',
      });
      testService = srvResult.service;
      testJobCard = srvResult.jobCard;
    });

    it('Test 1 & 3: Assigning Technician A saves assignment and triggers WhatsApp message with correct dynamic content', async () => {
      const assignResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/job-cards/${testJobCard.id}/assign`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          technicianId: technicianA.id,
          notes: 'Customer is available between 10am and 12pm. Bring spare sediment filters.',
        },
      });

      expect(assignResponse.statusCode).toBe(200);
      const json = assignResponse.json();
      expect(json.success).toBe(true);
      expect(json.data.technicianId).toBe(technicianA.id);
      expect(json.data.status).toBe('ASSIGNED');

      // Verify WhatsApp message was formatted and logged
      const [recentMsg] = await db
        .select()
        .from(whatsappMessages)
        .where(eq(whatsappMessages.direction, 'OUTBOUND'))
        .orderBy(desc(whatsappMessages.createdAt))
        .limit(1);

      expect(recentMsg).toBeDefined();
      expect(recentMsg.content).toContain('New Service Job Assigned');
      expect(recentMsg.content).toContain(`Customer: ${testCustomer.fullName}`);
      expect(recentMsg.content).toContain(`Customer Phone: ${testCustomer.phone}`);
      expect(recentMsg.content).toContain('Livpure');
      expect(recentMsg.content).toContain('SN-RO-119099');
      expect(recentMsg.content).toContain('Periodic Maintenance');
      expect(recentMsg.content).toContain('High');
      expect(recentMsg.content).toContain('03 Oct 2026');
      expect(recentMsg.content).toContain(`Job Card: ${testJobCard.jobCardNumber}`);
      expect(recentMsg.content).toContain('Please check the CRM for complete job details.');
    });

    it('Test 4: Authoritative CRM data verification (no record corruption)', async () => {
      const freshJobCard = await jobCardsRepository.findById(testJobCard.id);
      expect(freshJobCard).toBeDefined();
      expect(freshJobCard?.customerId).toBe(testCustomer.id);
      expect(freshJobCard?.customerName).toBe('Kartik Pawase');
      expect(freshJobCard?.customerPhone).toBe('9021653893');
      expect(freshJobCard?.assetId).toBe(testAsset.id);
      expect(freshJobCard?.serialNumber).toBe('SN-RO-119099');
      expect(freshJobCard?.serviceId).toBe(testService.id);
      expect(freshJobCard?.technicianId).toBe(technicianA.id);
      expect(freshJobCard?.technicianName).toBe('Aakash Sharma');
      expect(freshJobCard?.status).toBe('ASSIGNED');
    });

    it('Test 5: Reassigning to Technician B triggers new notification to Technician B', async () => {
      const reassignResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/job-cards/${testJobCard.id}/assign`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          technicianId: technicianB.id,
          notes: 'Reassigned due to scheduling conflict.',
        },
      });

      expect(reassignResponse.statusCode).toBe(200);
      const json = reassignResponse.json();
      expect(json.success).toBe(true);
      expect(json.data.technicianId).toBe(technicianB.id);

      // Verify WhatsApp message was sent to Technician B
      const [latestMsg] = await db
        .select()
        .from(whatsappMessages)
        .where(eq(whatsappMessages.direction, 'OUTBOUND'))
        .orderBy(desc(whatsappMessages.createdAt))
        .limit(1);

      expect(latestMsg).toBeDefined();
      expect(latestMsg.content).toContain(testJobCard.jobCardNumber);
    });

    it('Test 6: Invalid technician number produces meaningful failure without failing CRM assignment', async () => {
      let [invalidTech] = await db.select().from(technicians).where(eq(technicians.phone, '12345')).limit(1);
      if (!invalidTech) {
        const [newTech] = await db
          .insert(technicians)
          .values({
            fullName: 'Suresh Invalid',
            phone: '12345',
            email: 'suresh.invalid@srenterprises.com',
            status: 'ACTIVE',
          })
          .returning();
        invalidTech = newTech;
      }

      const assignResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/job-cards/${testJobCard.id}/assign`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          technicianId: invalidTech.id,
        },
      });

      // Assignment still succeeds in CRM
      expect(assignResponse.statusCode).toBe(200);
      const json = assignResponse.json();
      expect(json.success).toBe(true);
      expect(json.data.technicianId).toBe(invalidTech.id);

      // Direct WhatsApp dispatch returns structured failure with useful error
      const waResult = await whatsappService.notifyTechnicianJobAssignment(testJobCard.id);
      expect(waResult.success).toBe(false);
      expect(waResult.status).toBe('FAILED');
      expect(waResult.error).toContain('Invalid technician mobile number');
    });

    it('Test 7: Manual notify endpoint /notify-technician works for Job Cards and Services', async () => {
      // Reassign to valid Technician A
      await jobCardsService.assignTechnician(testJobCard.id, {
        technicianId: technicianA.id,
      });

      const retryResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/job-cards/${testJobCard.id}/notify-technician`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(retryResponse.statusCode).toBe(200);
      const json = retryResponse.json();
      expect(json.data.recipientPhone).toBe('919820011223');
      expect(json.data.technicianName).toBe('Aakash Sharma');

      const serviceNotifyResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/services/${testService.id}/notify-technician`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(serviceNotifyResponse.statusCode).toBe(200);
      const srvJson = serviceNotifyResponse.json();
      expect(srvJson.data.recipientPhone).toBe('919820011223');
    });

    it('Test 8: Recipient is verified to be assigned technician and not customer', async () => {
      const waResult = await whatsappService.notifyTechnicianJobAssignment(testJobCard.id, { forceResend: true });
      expect(waResult.recipientPhone).toBe('919820011223'); // Technician A phone
      expect(waResult.recipientPhone).not.toBe('919021653893'); // NOT Customer phone
    });
  });
});
