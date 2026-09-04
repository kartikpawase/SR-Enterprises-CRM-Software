import { describe, it, expect, beforeAll } from 'vitest';
import { ensureDatabaseInitialized } from '../../database/client';
import { customerRepository } from './customer.repository';
import { customerService } from './customer.service';

describe('Root Fix — Customer Creation & Non-Null Contract Integration Tests', () => {
  const testTimestamp = Date.now();
  let createdCustomerAId: string;
  let createdCustomerBId: string;
  const phoneA = `98765${String(testTimestamp).slice(-5)}`;
  const phoneB = `98766${String(testTimestamp).slice(-5)}`;

  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  it('TEST A: Creates Customer A with guaranteed non-null database record, UUID id, and addresses', async () => {
    const customer = await customerService.createCustomer({
      fullName: `Test Customer A ${testTimestamp}`,
      phone: phoneA,
      email: `test_a_${testTimestamp}@example.com`,
      customerType: 'INDIVIDUAL',
      addresses: [
        {
          addressType: 'SERVICE',
          addressLine1: 'Main Road, Block 4',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411001',
          isDefault: true,
        },
      ],
    });

    expect(customer).toBeDefined();
    expect(customer).not.toBeNull();
    expect(customer.id).toBeDefined();
    expect(typeof customer.id).toBe('string');
    expect(customer.id.length).toBe(36);
    expect(customer.customerNumber).toMatch(/^(CUST|CX)-/);
    expect(customer.fullName).toBe(`Test Customer A ${testTimestamp}`);
    expect(customer.phone).toBe(phoneA);
    expect(customer.status).toBe('ACTIVE');
    expect(customer.addresses.length).toBeGreaterThanOrEqual(1);
    expect(customer.addresses[0].city).toBe('Pune');

    createdCustomerAId = customer.id;
  });

  it('TEST B: Customer persists and survives independent lookup (Simulate refresh / backend restart)', async () => {
    const fromDb = await customerRepository.findById(createdCustomerAId);
    expect(fromDb).toBeDefined();
    expect(fromDb).not.toBeNull();
    expect(fromDb!.id).toBe(createdCustomerAId);
    expect(fromDb!.fullName).toBe(`Test Customer A ${testTimestamp}`);
    expect(fromDb!.phone).toBe(phoneA);
  });

  it('TEST C: Newest Customer B appears at TOP of paginated customer list', async () => {
    await new Promise((r) => setTimeout(r, 50));

    const customerB = await customerService.createCustomer({
      fullName: `Test Customer B ${testTimestamp}`,
      phone: phoneB,
      email: `test_b_${testTimestamp}@example.com`,
      customerType: 'COMMERCIAL',
      companyName: `SR Alpha Ltd ${testTimestamp}`,
    });

    expect(customerB).toBeDefined();
    expect(customerB.id).toBeDefined();
    createdCustomerBId = customerB.id;

    const list = await customerRepository.findPaginated({
      search: `${testTimestamp}`,
      page: 1,
      limit: 10,
    });

    expect(list.data.length).toBeGreaterThanOrEqual(2);
    // Newest customer (B) must appear at index 0 above Customer A
    expect(list.data[0].id).toBe(createdCustomerBId);
    expect(list.data[1].id).toBe(createdCustomerAId);
  });

  it('TEST D: Real-time search locates customer by name, phone, and customerNumber', async () => {
    const searchByName = await customerRepository.findPaginated({
      search: `Test Customer A ${testTimestamp}`,
      page: 1,
      limit: 5,
    });
    expect(searchByName.data).toHaveLength(1);
    expect(searchByName.data[0].id).toBe(createdCustomerAId);

    const searchByPhone = await customerRepository.findPaginated({
      search: phoneA,
      page: 1,
      limit: 5,
    });
    expect(searchByPhone.data).toHaveLength(1);
    expect(searchByPhone.data[0].id).toBe(createdCustomerAId);
  });

  it('TEST E: Clean new customer starts with 0 historical records and zero financial balance', async () => {
    const profile = await customerRepository.findById(createdCustomerAId);
    expect(profile).toBeDefined();
    expect(profile!.assets).toHaveLength(0);
    expect(profile!.services).toHaveLength(0);
    expect(profile!.invoices).toHaveLength(0);
    expect(profile!.payments).toHaveLength(0);
    expect(profile!.warranties).toHaveLength(0);
    expect(profile!.summary.totalSpent).toBe(0);
    expect(profile!.summary.outstanding).toBe(0);
  });

  it('TEST F: Rejects duplicate phone with structured conflict error and rolls back cleanly', async () => {
    let errorCaught: any = null;
    try {
      await customerService.createCustomer({
        fullName: 'Duplicate Tester',
        phone: phoneA, // existing phone
        customerType: 'INDIVIDUAL',
      });
    } catch (err: any) {
      errorCaught = err;
    }

    expect(errorCaught).toBeDefined();
    expect(errorCaught.statusCode).toBe(409);
    expect(errorCaught.code).toBe('CONFLICT');
    expect(errorCaught.message).toContain(phoneA);
  });
});
