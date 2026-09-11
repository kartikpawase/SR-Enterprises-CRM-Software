import { describe, it, expect, beforeEach } from 'vitest';
import { CustomerImporter } from '../modules/data-movement/importers/customer.importer';
import { db } from '../database/client';
import { customers } from '../database/schema/customers';
import { memoryCustomers } from '../modules/customers/customer.repository';
import { eq } from 'drizzle-orm';

describe('Customer Import Resilience & Duplicate Skip Verification', () => {
  const importer = new CustomerImporter();

  beforeEach(async () => {
    memoryCustomers.length = 0;
    try {
      await db.delete(customers).where(eq(customers.email, 'test1@srenterprises.com'));
      await db.delete(customers).where(eq(customers.email, 'test2@srenterprises.com'));
      await db.delete(customers).where(eq(customers.email, 'test3@srenterprises.com'));
    } catch {}
  });

  it('correctly extracts customer fields from diverse column variations', () => {
    const rawRow = {
      'Client Name': 'Siddharth Shantaram Varpe',
      'Contact No': '+91 97111 85045',
      'Email ID': 'siddharth@example.com',
      'Site Address': 'Baner, Pune, Maharashtra',
      'Pin Code': '411045',
      'Category': 'Commercial',
    };

    const fields = importer.extractCustomerFields(rawRow);
    expect(fields.fullName).toBe('Siddharth Shantaram Varpe');
    expect(fields.phone).toBe('9711185045');
    expect(fields.email).toBe('siddharth@example.com');
    expect(fields.customerType).toBe('COMMERCIAL');
    expect(fields.postalCode).toBe('411045');
  });

  it('executes batch import with SKIP duplicates policy and collision-free customer numbers', async () => {
    const ts = Date.now().toString().slice(-5);
    const phone1 = `982${ts}01`;
    const phone2 = `982${ts}02`;
    const phone3 = `982${ts}03`;

    const records = [
      {
        fullName: 'Import Test User 1',
        phone: phone1,
        email: `test1_${ts}@srenterprises.com`,
        addressLine1: 'Shivaji Nagar, Pune',
        city: 'Pune',
        state: 'Maharashtra',
      },
      {
        fullName: 'Import Test User 2',
        phone: phone2,
        email: `test2_${ts}@srenterprises.com`,
        addressLine1: 'Kothrud, Pune',
        city: 'Pune',
        state: 'Maharashtra',
      },
      // Duplicate of User 1 within same file
      {
        fullName: 'Import Test User 1 Duplicate',
        phone: phone1,
        email: `duplicate_${ts}@srenterprises.com`,
        addressLine1: 'Baner, Pune',
        city: 'Pune',
        state: 'Maharashtra',
      },
    ];

    const result = await importer.execute(records, 'SKIP');

    expect(result.totalProcessed).toBe(3);
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);

    // Verify subsequent batch gets collision-free numbers
    const batch2 = [
      {
        fullName: 'Import Test User 3',
        phone: phone3,
        email: `test3_${ts}@srenterprises.com`,
      },
      // Duplicate of existing user from batch 1
      {
        fullName: 'Import Test User 2 Duplicate in Batch 2',
        phone: phone2,
      },
    ];

    const result2 = await importer.execute(batch2, 'SKIP');
    expect(result2.imported).toBe(1);
    expect(result2.skipped).toBe(1);
  });
});
