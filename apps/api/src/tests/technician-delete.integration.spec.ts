import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, ensureDatabaseInitialized, closeDatabaseConnections } from '../database/client';
import {
  technicians,
  customers,
  services,
  jobCards,
} from '../database/schema';
import { techniciansRepository } from '../modules/technicians/technicians.repository';
import { techniciansService } from '../modules/technicians/technicians.service';
import { memoryJobCards } from '../modules/job-cards/job-cards.repository';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Technician Safe Delete Integration Test Suite', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  afterAll(async () => {
    await closeDatabaseConnections();
  });

  it('TEST 1 & 2: deletes an eligible technician with no assigned services or job cards', async () => {
    // 1. Create a fresh test technician
    const testTech = await techniciansRepository.create({
      fullName: 'Vijay Deshmukh',
      phone: '9899887766',
      email: 'vijay.d@srenterprises.com',
      status: 'ACTIVE',
      skills: ['RO Installation', 'TDS Calibration'],
      address: 'Shop 12, Nashik Road',
    });

    expect(testTech).toBeDefined();
    expect(testTech.id).toBeDefined();

    // Verify presence in DB
    const fetched = await techniciansRepository.findById(testTech.id);
    expect(fetched).toBeDefined();
    expect(fetched?.fullName).toBe('Vijay Deshmukh');

    // 2. Delete the technician
    const delResult = await techniciansService.deleteTechnician(testTech.id);
    expect(delResult).toBeDefined();
    expect(delResult.success).toBe(true);

    // 3. Verify absence in DB
    const postFetch = await techniciansRepository.findById(testTech.id);
    expect(postFetch).toBeNull();
  });

  it('TEST 6: blocks deletion of a technician assigned to active/historical job cards and preserves all records', async () => {
    // 1. Create a customer
    const [cust] = await db
      .insert(customers)
      .values({
        customerNumber: `CX-TECH-TEST-${Date.now()}`,
        fullName: 'Test Customer For Tech',
        phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        customerType: 'INDIVIDUAL',
        status: 'ACTIVE',
      })
      .returning();

    // 2. Create a technician
    const assignedTech = await techniciansRepository.create({
      fullName: 'Rahul Joshi',
      phone: `9811${Math.floor(100000 + Math.random() * 900000)}`,
      email: 'rahul.j@srenterprises.com',
      status: 'ACTIVE',
      skills: ['Filter Replacement'],
    });

    // 3. Add an assigned job card to memoryJobCards for this technician
    const testJc = {
      id: `jc-dep-${Date.now()}`,
      jobCardNumber: `JC-TECH-${Date.now()}`,
      customerId: cust.id,
      technicianId: assignedTech.id,
      status: 'ASSIGNED',
      priority: 'MEDIUM',
    };
    memoryJobCards.push(testJc as any);

    // 4. Attempt deletion -> MUST fail
    await expect(techniciansService.deleteTechnician(assignedTech.id)).rejects.toThrow(
      /Cannot delete technician "Rahul Joshi"/
    );

    // 5. Verify technician STILL EXISTS and is untouched
    const techStillExists = await techniciansRepository.findById(assignedTech.id);
    expect(techStillExists).toBeDefined();
    expect(techStillExists?.fullName).toBe('Rahul Joshi');

    // Cleanup test records
    const idx = memoryJobCards.findIndex((j) => j.id === testJc.id);
    if (idx !== -1) memoryJobCards.splice(idx, 1);
    await db.delete(customers).where(eq(customers.id, cust.id));
    await techniciansRepository.delete(assignedTech.id);
  });

  it('throws error when attempting to delete non-existent technician', async () => {
    const fakeId = randomUUID();
    await expect(techniciansService.deleteTechnician(fakeId)).rejects.toThrow(
      'Technician not found'
    );
  });
});
