import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as XLSX from 'xlsx';
import { db, closeDatabaseConnections, ensureDatabaseInitialized } from '../database/client';
import { customers, customerAddresses } from '../database/schema/customers';
import { dataImportService } from '../modules/data-movement/import.service';
import { CustomerRepository } from '../modules/customers/customer.repository';
import { SalesRepository } from '../modules/sales/sales.repository';
import { ilike, eq } from 'drizzle-orm';

describe('Master Excel Customer Import End-to-End & 10,000-Record Lifecycle Test', () => {
  const customerRepo = new CustomerRepository();
  const salesRepo = new SalesRepository();
  const testRunId = String(Date.now()).slice(-5);

  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  afterAll(async () => {
    await closeDatabaseConnections();
  });

  it('TEST 1 & TEST 2: Imports 1 valid customer and multiple valid customers', async () => {
    const records = [
      {
        fullName: `Test Single Customer ${testRunId}`,
        phone: `91${testRunId}0001`,
        email: `single.${testRunId}@example.com`,
        city: 'Pune',
      },
      {
        fullName: `Test Multi Customer 1 ${testRunId}`,
        phone: `91${testRunId}0002`,
        email: `multi1.${testRunId}@example.com`,
        city: 'Mumbai',
      },
      {
        fullName: `Test Multi Customer 2 ${testRunId}`,
        phone: `91${testRunId}0003`,
        email: `multi2.${testRunId}@example.com`,
        city: 'Nagpur',
      },
    ];

    const preview = await dataImportService.preview('customer', records);
    expect(preview.totalRows).toBe(3);
    expect(preview.validRows).toBe(3);
    expect(preview.invalidRows).toBe(0);

    const result = await dataImportService.execute('customer', records, 'CREATE', {
      userId: 'test-admin',
      userRole: 'Super Admin',
    });

    expect(result.imported).toBe(3);
    expect(result.failed).toBe(0);

    // Verify stored in DB
    const found = await db.select().from(customers).where(eq(customers.phone, `91${testRunId}0001`));
    expect(found.length).toBe(1);
    expect(found[0].fullName).toBe(`Test Single Customer ${testRunId}`);
    expect(found[0].customerNumber).toMatch(/^CX-/);
  });

  it('TEST 4, 5, 6: Handles duplicate detection, missing optional fields, and invalid required fields', async () => {
    const mixedRecords = [
      { fullName: `Valid New Cust ${testRunId}`, phone: `92${testRunId}0001`, email: `validnew.${testRunId}@example.com` },
      { fullName: 'Missing Phone Row', phone: '', email: 'missingphone@example.com' },
      { fullName: 'Invalid Phone Digits', phone: '12345', email: 'short@example.com' },
      { fullName: 'Invalid Email Format', phone: `92${testRunId}0002`, email: 'not-an-email' },
      { fullName: 'Duplicate Within Batch', phone: `92${testRunId}0001` }, // Duplicate of row 1
    ];

    const preview = await dataImportService.preview('customer', mixedRecords);
    expect(preview.totalRows).toBe(5);
    expect(preview.validRows).toBe(1);
    expect(preview.invalidRows).toBe(4);
    expect(preview.duplicateRows).toBe(1);

    // Test SKIP duplicate policy
    const result = await dataImportService.execute('customer', mixedRecords, 'SKIP');
    expect(result.imported).toBe(1);
    expect(result.failed).toBe(3); // missing phone, short phone, invalid email
    expect(result.skipped).toBe(1); // duplicate
  });

  it('TEST 7 & TEST 8: Handles Excel files with reordered columns, extra columns, and numeric phone formats', async () => {
    // Generate an actual binary Excel workbook with varied columns
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Notes', 'Contact Number', 'Customer Name', 'Tax ID', 'Site Location', 'Category'],
      ['VIP client', Number(`93${testRunId}0001`), `Reordered Col User 1 ${testRunId}`, '27ABCDE1234F1Z5', 'Kalyani Nagar, Pune', 'Commercial'],
      ['Regular client', `93${testRunId}0002`, `Reordered Col User 2 ${testRunId}`, '', 'Viman Nagar, Pune', 'Individual'],
      ['No address', Number(`93${testRunId}0003`), `Reordered Col User 3 ${testRunId}`, '', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Parse back using XLSX (simulating frontend parser)
    const readWb = XLSX.read(buffer, { type: 'buffer' });
    const rawRows: Array<Record<string, any>> = XLSX.utils.sheet_to_json(readWb.Sheets[readWb.SheetNames[0]], {
      defval: '',
      raw: false,
    });

    expect(rawRows.length).toBe(3);

    const result = await dataImportService.execute('customer', rawRows, 'CREATE');
    expect(result.imported).toBe(3);
    expect(result.failed).toBe(0);

    const foundCust = await db.select().from(customers).where(eq(customers.phone, `93${testRunId}0001`));
    expect(foundCust.length).toBe(1);
    expect(foundCust[0].fullName).toBe(`Reordered Col User 1 ${testRunId}`);
    expect(foundCust[0].customerType).toBe('COMMERCIAL');
  });

  it('TEST 3: High-Performance 10,000-Record Excel Import Test', async () => {
    console.log('Generating 10,000 customer records in memory...');
    const records10k: Array<Record<string, any>> = [];

    for (let i = 1; i <= 10000; i++) {
      const padded = String(i).padStart(5, '0');
      const uniquePhone = `7${String(testRunId).slice(-4)}${String(10000 + i).slice(-5)}`;
      records10k.push({
        fullName: `Bulk Customer ${padded} Sharma ${testRunId}`,
        phone: uniquePhone,
        email: `bulk.cust.${testRunId}.${padded}@example.com`,
        customerType: i % 10 === 0 ? 'Commercial' : 'Individual',
        companyName: i % 10 === 0 ? `Enterprise Co ${padded}` : '',
        addressLine1: `Flat ${i}, Tower ${i % 20}, Pune IT Park`,
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        notes: `Bulk import record #${i}`,
      });
    }

    expect(records10k.length).toBe(10000);

    console.log('Executing 10,000-record import...');
    const start = Date.now();
    const result = await dataImportService.execute('customer', records10k, 'CREATE');
    const elapsed = Date.now() - start;

    console.log(`10,000 records imported in ${elapsed}ms:`, {
      totalProcessed: result.totalProcessed,
      imported: result.imported,
      failed: result.failed,
      skipped: result.skipped,
    });

    expect(result.totalProcessed).toBe(10000);
    expect(result.imported).toBe(10000);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);

    // Verify sample record in database
    const targetPhone = records10k[4999].phone;
    const sampleRecord = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, targetPhone));
    expect(sampleRecord.length).toBe(1);
    expect(sampleRecord[0].fullName).toBe(records10k[4999].fullName);
  }, 30000);

  it('TEST 10, 11, 12, 13, 14, 15, 16: Full Lifecycle & Universal Workflow Verification', async () => {
    // Pick imported customer
    const [targetCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, `91${testRunId}0001`));
    expect(targetCustomer).toBeDefined();

    // TEST 13: Profile Retrieval via CustomerRepository.findById
    const profile = await customerRepo.findById(targetCustomer.id);
    expect(profile).not.toBeNull();
    expect(profile?.fullName).toBe(`Test Single Customer ${testRunId}`);
    expect(profile?.phone).toBe(`91${testRunId}0001`);
    expect(profile?.addresses.length).toBeGreaterThanOrEqual(1);

    // TEST 12: Search for imported customer
    const searchRes = await customerRepo.findPaginated({
      search: `Single Customer ${testRunId}`,
      page: 1,
      limit: 10,
    });
    expect(searchRes.data.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.data[0].id).toBe(targetCustomer.id);

    // TEST 14: Use imported customer in Sales workflow (Create Sale)
    const saleResult = await salesRepo.createSale(
      {
        customerId: targetCustomer.id,
        saleType: 'DIRECT_SALE',
        paymentMethod: 'UPI',
        status: 'COMPLETED',
        notes: 'Sale created for bulk imported customer',
        items: [
          {
            itemType: 'PRODUCT',
            productName: 'SR Aqua RO Unit',
            quantity: 1,
            unitPrice: 15000,
            gstRate: 18,
          },
        ],
      },
      'admin-user-id'
    );
    expect(saleResult).toBeDefined();
    expect(saleResult.customerId).toBe(targetCustomer.id);
    expect(saleResult.saleNumber).toMatch(/^SALE-/);

    // TEST 16: Verify manual customer creation still works 100%
    const manualCustomer = await customerRepo.create(
      {
        fullName: `Manual Created User ${testRunId}`,
        phone: `96${testRunId}9999`,
        email: `manual.${testRunId}@example.com`,
        customerType: 'INDIVIDUAL',
        addresses: [
          {
            addressType: 'SERVICE',
            addressLine1: 'Shop 5, Deccan Gymkhana',
            city: 'Pune',
            state: 'Maharashtra',
            postalCode: '411004',
            isDefault: true,
          },
        ],
      },
      'admin-user-id'
    );
    expect(manualCustomer).toBeDefined();
    expect(manualCustomer.fullName).toBe(`Manual Created User ${testRunId}`);
    expect(manualCustomer.customerNumber).toMatch(/^CX-/);

    // TEST 10 & 11 & 15: Simulate Server Restart (Close DB connection & reopen)
    console.log('Simulating server restart...');
    await closeDatabaseConnections();
    await ensureDatabaseInitialized();

    // Verify imported and manual customers exist and remain permanently stored
    const restoredTarget = await customerRepo.findById(targetCustomer.id);
    expect(restoredTarget).not.toBeNull();
    expect(restoredTarget?.fullName).toBe(`Test Single Customer ${testRunId}`);
    expect(restoredTarget?.sales.length).toBe(1);

    const restoredManual = await customerRepo.findById(manualCustomer.id);
    expect(restoredManual).not.toBeNull();
    expect(restoredManual?.fullName).toBe(`Manual Created User ${testRunId}`);
  });
});
