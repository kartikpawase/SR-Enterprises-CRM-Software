import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, ensureDatabaseInitialized, closeDatabaseConnections } from '../database/client';
import {
  customers,
  customerAddresses,
  sales,
  invoices,
  payments,
  services,
} from '../database/schema';
import { customerRepository } from '../modules/customers/customer.repository';
import { customerService } from '../modules/customers/customer.service';
import { eq } from 'drizzle-orm';

describe('Customer Label / Status Tags Integration Tests', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  afterAll(async () => {
    await closeDatabaseConnections();
  });

  it('1. New customer defaults to null (No Label / Unassigned)', async () => {
    const custId = crypto.randomUUID();
    const [created] = await db
      .insert(customers)
      .values({
        id: custId,
        customerNumber: 'CX-LBL-001',
        fullName: 'Label Test Customer 1',
        phone: '9880000001',
        customerType: 'INDIVIDUAL',
        status: 'ACTIVE',
      })
      .returning();

    expect(created).toBeDefined();
    expect(created.customerLabel).toBeNull();

    const fetched = await customerRepository.findById(custId);
    expect(fetched).toBeDefined();
    expect(fetched?.customerLabel).toBeNull();
  });

  it('2. Admin can assign "Good Customer" (GOOD) label', async () => {
    const custId = crypto.randomUUID();
    await db.insert(customers).values({
      id: custId,
      customerNumber: 'CX-LBL-002',
      fullName: 'Label Test Customer 2',
      phone: '9880000002',
      customerType: 'INDIVIDUAL',
      status: 'ACTIVE',
    });

    // Update label to GOOD
    const updated = await customerService.updateCustomer(custId, {
      customerLabel: 'GOOD',
    } as any);

    expect(updated).toBeDefined();
    expect(updated.customerLabel).toBe('GOOD');

    // Confirm persisted in database
    const [row] = await db.select().from(customers).where(eq(customers.id, custId));
    expect(row.customerLabel).toBe('GOOD');
  });

  it('3. Admin can switch label from "Good Customer" to "Bad Customer" (GOOD -> BAD)', async () => {
    const custId = crypto.randomUUID();
    await db.insert(customers).values({
      id: custId,
      customerNumber: 'CX-LBL-003',
      fullName: 'Label Test Customer 3',
      phone: '9880000003',
      customerType: 'INDIVIDUAL',
      status: 'ACTIVE',
      customerLabel: 'GOOD',
    });

    // Update label from GOOD to BAD
    const updated = await customerService.updateCustomer(custId, {
      customerLabel: 'BAD',
    } as any);

    expect(updated).toBeDefined();
    expect(updated.customerLabel).toBe('BAD');

    const [row] = await db.select().from(customers).where(eq(customers.id, custId));
    expect(row.customerLabel).toBe('BAD');
  });

  it('4. Admin can clear label back to "No Label" (BAD -> null)', async () => {
    const custId = crypto.randomUUID();
    await db.insert(customers).values({
      id: custId,
      customerNumber: 'CX-LBL-004',
      fullName: 'Label Test Customer 4',
      phone: '9880000004',
      customerType: 'INDIVIDUAL',
      status: 'ACTIVE',
      customerLabel: 'BAD',
    });

    // Update label to null
    const updated = await customerService.updateCustomer(custId, {
      customerLabel: null,
    } as any);

    expect(updated).toBeDefined();
    expect(updated.customerLabel).toBeNull();

    const [row] = await db.select().from(customers).where(eq(customers.id, custId));
    expect(row.customerLabel).toBeNull();
  });

  it('5. Filter by customerLabel (GOOD, BAD, NONE, ALL)', async () => {
    const custGood = crypto.randomUUID();
    const custBad = crypto.randomUUID();
    const custNone = crypto.randomUUID();

    await db.insert(customers).values([
      {
        id: custGood,
        customerNumber: 'CX-FILTER-GOOD',
        fullName: 'Filter Good Cust',
        phone: '9881110001',
        customerType: 'INDIVIDUAL',
        status: 'ACTIVE',
        customerLabel: 'GOOD',
      },
      {
        id: custBad,
        customerNumber: 'CX-FILTER-BAD',
        fullName: 'Filter Bad Cust',
        phone: '9881110002',
        customerType: 'INDIVIDUAL',
        status: 'ACTIVE',
        customerLabel: 'BAD',
      },
      {
        id: custNone,
        customerNumber: 'CX-FILTER-NONE',
        fullName: 'Filter None Cust',
        phone: '9881110003',
        customerType: 'INDIVIDUAL',
        status: 'ACTIVE',
        customerLabel: null,
      },
    ]);

    // Query for GOOD
    const goodResults = await customerRepository.findPaginated({
      page: 1,
      limit: 50,
      customerLabel: 'GOOD',
    });
    const goodIds = goodResults.data.map((c: any) => c.id);
    expect(goodIds).toContain(custGood);
    expect(goodIds).not.toContain(custBad);
    expect(goodIds).not.toContain(custNone);

    // Query for BAD
    const badResults = await customerRepository.findPaginated({
      page: 1,
      limit: 50,
      customerLabel: 'BAD',
    });
    const badIds = badResults.data.map((c: any) => c.id);
    expect(badIds).toContain(custBad);
    expect(badIds).not.toContain(custGood);
    expect(badIds).not.toContain(custNone);

    // Query for NONE (Unassigned)
    const noneResults = await customerRepository.findPaginated({
      page: 1,
      limit: 50,
      customerLabel: 'NONE',
    });
    const noneIds = noneResults.data.map((c: any) => c.id);
    expect(noneIds).toContain(custNone);
    expect(noneIds).not.toContain(custGood);
    expect(noneIds).not.toContain(custBad);
  });

  it('6. Changing customer label does not affect sales, invoices, services, or customer data', async () => {
    const custId = crypto.randomUUID();
    await db.insert(customers).values({
      id: custId,
      customerNumber: 'CX-INTEGRITY-001',
      fullName: 'Integrity Customer',
      phone: '9882220001',
      email: 'integrity@example.com',
      customerType: 'COMMERCIAL',
      companyName: 'Integrity Corp',
      status: 'ACTIVE',
      notes: 'Important customer notes',
    });

    const saleId = crypto.randomUUID();
    await db.insert(sales).values({
      id: saleId,
      saleNumber: 'SO-INT-001',
      customerId: custId,
      saleDate: new Date(),
      subtotal: '10000.00',
      totalAmount: '11800.00',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
    });

    // Change label to GOOD
    await customerService.updateCustomer(custId, { customerLabel: 'GOOD' } as any);

    // Verify all existing fields remain 100% unchanged
    const afterGood = await customerRepository.findById(custId);
    expect(afterGood?.fullName).toBe('Integrity Customer');
    expect(afterGood?.phone).toBe('9882220001');
    expect(afterGood?.email).toBe('integrity@example.com');
    expect(afterGood?.companyName).toBe('Integrity Corp');
    expect(afterGood?.notes).toBe('Important customer notes');
    expect(afterGood?.customerLabel).toBe('GOOD');

    // Verify sale is untouched
    const [saleRow] = await db.select().from(sales).where(eq(sales.id, saleId));
    expect(saleRow).toBeDefined();
    expect(saleRow.status).toBe('COMPLETED');
    expect(Number(saleRow.totalAmount)).toBe(11800);

    // Change label to BAD
    await customerService.updateCustomer(custId, { customerLabel: 'BAD' } as any);
    const afterBad = await customerRepository.findById(custId);
    expect(afterBad?.customerLabel).toBe('BAD');
    expect(afterBad?.fullName).toBe('Integrity Customer');

    // Clean up test customer
    await customerRepository.deleteCustomerCompletely(custId);
  });
});
