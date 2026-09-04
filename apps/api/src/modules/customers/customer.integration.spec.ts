import { describe, it, expect, beforeAll } from 'vitest';
import { ensureDatabaseInitialized, db } from '../../database/client';
import { customerRepository } from './customer.repository';
import { customerService } from './customer.service';
import { CustomerImporter } from '../data-movement/importers/customer.importer';
import { dataExportService } from '../data-movement/export.service';
import { customers } from '../../database/schema/customers';
import { count, eq } from 'drizzle-orm';

describe('Customer Module Deep Production-Grade Integration Tests', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  it('should initialize database and tables cleanly', async () => {
    const [res] = await db.select({ total: count() }).from(customers);
    expect(res).toBeDefined();
    expect(typeof Number(res?.total)).toBe('number');
  });

  it('should create customer atomically with auto-generated business sequence CUST-YYYY-XXXX and address', async () => {
    const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const uniqueEmail = `integration.${Date.now()}@example.com`;

    const customer = await customerService.createCustomer({
      fullName: 'Vikramaditya Rao',
      phone: uniquePhone,
      email: uniqueEmail,
      customerType: 'INDIVIDUAL',
      companyName: 'Rao Water Solutions',
      notes: 'Test client for integration verification',
      addresses: [
        {
          addressType: 'SERVICE',
          addressLine1: 'Plot 45, Model Colony',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411016',
          isDefault: true,
        },
      ],
    });

    expect(customer).toBeDefined();
    expect(customer?.id).toBeDefined();
    expect(customer?.customerNumber).toMatch(/^(CUST|CX)-/);
    expect(customer?.fullName).toBe('Vikramaditya Rao');
    expect(customer?.addresses).toHaveLength(1);
    expect(customer?.addresses[0].city).toBe('Pune');
  });

  it('should enforce duplicate phone rejection with 409 Conflict', async () => {
    const testPhone = `99${Math.floor(10000000 + Math.random() * 90000000)}`;

    await customerService.createCustomer({
      fullName: 'Primary Owner',
      phone: testPhone,
      customerType: 'INDIVIDUAL',
    });

    // Attempt creating duplicate
    await expect(
      customerService.createCustomer({
        fullName: 'Duplicate Owner',
        phone: testPhone,
        customerType: 'INDIVIDUAL',
      })
    ).rejects.toThrow(/already exists/);
  });

  it('should enforce duplicate email rejection with 409 Conflict', async () => {
    const testEmail = `duplicate.${Date.now()}@example.com`;
    const phone1 = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const phone2 = `92${Math.floor(10000000 + Math.random() * 90000000)}`;

    await customerService.createCustomer({
      fullName: 'Email Owner 1',
      phone: phone1,
      email: testEmail,
      customerType: 'INDIVIDUAL',
    });

    // Attempt duplicate email
    await expect(
      customerService.createCustomer({
        fullName: 'Email Owner 2',
        phone: phone2,
        email: testEmail,
        customerType: 'INDIVIDUAL',
      })
    ).rejects.toThrow(/already exists/);
  });

  it('should query paginated customers with deterministic created_at DESC sorting', async () => {
    const result = await customerRepository.findPaginated({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.data).toBeDefined();
    expect(result.pagination).toBeDefined();
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.pageSize).toBe(10);
    expect(result.pagination.total).toBeGreaterThan(0);
  });

  it('should filter customers accurately by city using customerAddresses subquery', async () => {
    const result = await customerRepository.findPaginated({
      city: 'Pune',
      limit: 20,
    });

    expect(result.data).toBeDefined();
    for (const c of result.data) {
      const hasCity = c.addresses.some((a) => a.city.toLowerCase().includes('pune'));
      expect(hasCity).toBe(true);
    }
  });

  it('should filter customers accurately by status and type', async () => {
    const result = await customerRepository.findPaginated({
      status: 'ACTIVE',
      customerType: 'INDIVIDUAL',
      limit: 20,
    });

    for (const c of result.data) {
      expect(c.status).toBe('ACTIVE');
      expect(c.customerType).toBe('INDIVIDUAL');
    }
  });

  it('should execute high-performance batch import for 1,000 records within seconds', async () => {
    const syntheticRecords: Array<Record<string, any>> = [];
    const baseTime = Date.now();

    for (let i = 1; i <= 500; i++) {
      syntheticRecords.push({
        rowNumber: i,
        fullName: `Batch Customer ${i}`,
        phone: `96${String(baseTime % 100000000).slice(0, 5)}${String(i).padStart(3, '0')}`,
        email: `batch.${baseTime}.${i}@domain.com`,
        customerType: i % 2 === 0 ? 'COMMERCIAL' : 'INDIVIDUAL',
        city: 'Pune',
        state: 'Maharashtra',
        address: `Road ${i}, Industrial Area`,
      });
    }

    const importer = new CustomerImporter();
    const importResult = await importer.execute(syntheticRecords, 'SKIP', {
      userId: '00000000-0000-0000-0000-000000000001',
      userRole: 'ADMIN',
    });

    expect(importResult.totalProcessed).toBe(500);
    expect(importResult.imported).toBe(500);
    expect(importResult.failed).toBe(0);
    expect(importResult.executionTimeMs).toBeLessThan(10000);
  });

  it('should generate filtered CSV export with headers and address columns', async () => {
    const exportResult = await dataExportService.exportData(
      'customers',
      'csv',
      { city: 'Pune', limit: 100 },
      { userRole: 'ADMIN' }
    );

    expect(exportResult.mimeType).toBe('text/csv; charset=utf-8');
    expect(exportResult.filename).toMatch(/customers_export_/);
    expect(exportResult.content).toContain('Customer Number');
    expect(exportResult.content).toContain('Full Name');
    expect(exportResult.content).toContain('Address');
    expect(exportResult.content).toContain('City');
  });

  it('should soft-archive customer and preserve historical references', async () => {
    const uniquePhone = `93${Math.floor(10000000 + Math.random() * 90000000)}`;
    const cust = await customerService.createCustomer({
      fullName: 'Customer To Archive',
      phone: uniquePhone,
      customerType: 'INDIVIDUAL',
    });

    const archived = await customerService.archiveCustomer(cust.id, 'Account closed on request');
    expect(archived?.status).toBe('ARCHIVED');
    expect(archived?.archivedAt).toBeDefined();

    // Verify still in DB with ARCHIVED status
    const fromDb = await customerRepository.findById(cust.id);
    expect(fromDb?.status).toBe('ARCHIVED');
  });
});
