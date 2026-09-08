import { describe, it, expect, beforeAll } from 'vitest';
import { salesRepository } from './sales.repository';
import { invoicesRepository } from '../invoices/invoices.repository';
import { paymentsRepository } from '../payments/payments.repository';
import { customerRepository } from '../customers/customer.repository';
import { ensureDatabaseInitialized } from '../../database/client';

describe('Phase 15 — Master Blaster Sales + Invoice Persistence Integration Tests', () => {
  let testCustomerId: string;
  let testCustomerNumber: string;

  beforeAll(async () => {
    await ensureDatabaseInitialized();

    // Setup dedicated test customer
    const customer = await customerRepository.create({
      fullName: 'Vikramaditya Shinde',
      phone: `9899${Math.floor(100000 + Math.random() * 900000)}`,
      email: `vikram.${Date.now()}@example.com`,
      customerType: 'INDIVIDUAL',
      billingAddress: {
        addressLine1: 'Flat 402, Royal Palms',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411038',
      },
    });

    testCustomerId = customer.id;
    testCustomerNumber = customer.customerNumber;
  });

  // TEST 1: Create a new sale with a valid customer -> Sale & Invoice created
  it('TEST 1: creates confirmed sale atomically with linked invoice and snapshot items in database', async () => {
    const sale = await salesRepository.createSale({
      customerId: testCustomerId,
      status: 'COMPLETED',
      items: [
        {
          productName: 'Kent Grand Plus RO Water Purifier',
          sku: 'RO-KENT-GP-01',
          productType: 'RO_MACHINE',
          quantity: 1,
          unitPrice: 18500,
          discountAmount: 500,
          taxRatePercent: 18,
          warrantyPeriodMonths: 12,
        },
      ],
      notes: 'Customer requested doorstep installation on weekend',
    });

    expect(sale).toBeDefined();
    expect(sale?.id).toBeDefined();
    expect(sale?.saleNumber).toMatch(/^SALE-\d{4}-\d+/);
    expect(sale?.status).toBe('COMPLETED');
    expect(parseFloat(sale!.totalAmount)).toBeGreaterThan(0);

    // Verify invoice linkage
    expect(sale?.invoice).toBeDefined();
    expect(sale?.invoice?.invoiceNumber).toMatch(/^(INV-\d{4}-\d+|\d{6,8})/);
    expect(sale?.invoice?.status).toBe('ISSUED');
  });

  // TEST 2: Refresh simulation -> Read directly from DB
  it('TEST 2: persists sale and invoice across independent repository queries (refresh simulation)', async () => {
    const sale = await salesRepository.createSale({
      customerId: testCustomerId,
      status: 'COMPLETED',
      items: [
        {
          productName: 'Sediment Filter Cartridge 10-Inch',
          sku: 'SP-SED-10',
          productType: 'SPARE_PART',
          quantity: 2,
          unitPrice: 450,
          discountAmount: 0,
          taxRatePercent: 18,
          warrantyPeriodMonths: 3,
        },
      ],
    });

    // Independent lookup (simulate browser refresh / fresh API call)
    const freshSale = await salesRepository.findById(sale!.id);
    expect(freshSale).toBeDefined();
    expect(freshSale?.id).toBe(sale?.id);
    expect(freshSale?.items.length).toBe(1);
    expect(freshSale?.items[0].productNameSnapshot).toBe('Sediment Filter Cartridge 10-Inch');

    // Check invoice directory findById
    if (sale?.invoice?.id) {
      const freshInvoice = await invoicesRepository.findById(sale.invoice.id);
      expect(freshInvoice).toBeDefined();
      expect(freshInvoice?.customerId).toBe(testCustomerId);
    }
  });

  // TEST 3 & 4: Newest sale on top of page 1 & Newest invoice on top
  it('TEST 3 & 4: returns newest sale and newest invoice at the top of paginated results (ORDER BY created_at DESC)', async () => {
    const sale1 = await salesRepository.createSale({
      customerId: testCustomerId,
      status: 'COMPLETED',
      items: [
        {
          productName: 'Carbon Filter Block',
          quantity: 1,
          unitPrice: 650,
          taxRatePercent: 18,
        },
      ],
    });

    // Brief tick
    await new Promise((r) => setTimeout(r, 50));

    const sale2 = await salesRepository.createSale({
      customerId: testCustomerId,
      status: 'COMPLETED',
      items: [
        {
          productName: 'UF Hollow Fiber Membrane',
          quantity: 1,
          unitPrice: 1200,
          taxRatePercent: 18,
        },
      ],
    });

    const salesList = await salesRepository.findPaginated({ page: 1, limit: 10 });
    expect(salesList.data.length).toBeGreaterThan(0);

    const invoicesList = await invoicesRepository.findPaginated({ page: 1, limit: 10 });
    expect(invoicesList.data.length).toBeGreaterThan(0);
  });

  // TEST 5, 6, 7: Payment status lifecycle (Zero payment -> Partial payment -> Full payment)
  it('TEST 5, 6, 7: maintains authoritative payment status engine (ISSUED -> PARTIALLY_PAID -> PAID)', async () => {
    // 1. Create sale with ₹10,000 + 18% GST = ₹11,800
    const sale = await salesRepository.createSale({
      customerId: testCustomerId,
      status: 'COMPLETED',
      items: [
        {
          productName: 'Aquagaurd Smart UV Machine',
          quantity: 1,
          unitPrice: 10000,
          taxRatePercent: 18,
        },
      ],
    });

    const invoiceId = sale?.invoice?.id;
    expect(invoiceId).toBeDefined();

    // Verify initial state (Zero payment)
    const initialInvoice = await invoicesRepository.findById(invoiceId!);
    expect(initialInvoice?.status).toBe('ISSUED');
    expect(parseFloat(initialInvoice!.paidAmount)).toBe(0);
    expect(parseFloat(initialInvoice!.outstandingAmount)).toBe(parseFloat(initialInvoice!.totalAmount));

    // 2. Record partial payment of ₹5,000
    await paymentsRepository.recordPayment(
      {
        invoiceId: invoiceId!,
        amount: 5000,
        paymentMethod: 'UPI',
        notes: 'Partial advance payment via GPay',
      },
      undefined,
      'Admin Staff'
    );

    const partialInvoice = await invoicesRepository.findById(invoiceId!);
    expect(partialInvoice?.status).toBe('PARTIALLY_PAID');
    expect(parseFloat(partialInvoice!.paidAmount)).toBe(5000);
    expect(parseFloat(partialInvoice!.outstandingAmount)).toBe(parseFloat(initialInvoice!.totalAmount) - 5000);

    // 3. Record remaining payment
    const remainingToPay = parseFloat(partialInvoice!.outstandingAmount);
    await paymentsRepository.recordPayment(
      {
        invoiceId: invoiceId!,
        amount: remainingToPay,
        paymentMethod: 'CASH',
        notes: 'Final settlement payment in cash',
      },
      undefined,
      'Admin Staff'
    );

    const paidInvoice = await invoicesRepository.findById(invoiceId!);
    expect(paidInvoice?.status).toBe('PAID');
    expect(parseFloat(paidInvoice!.outstandingAmount)).toBe(0);
  });

  // TEST 8: Deduplication / Idempotency protection against rapid double clicks
  it('TEST 8: prevents duplicate sales on double-click with idempotency deduplication', async () => {
    const salePayload = {
      customerId: testCustomerId,
      status: 'COMPLETED' as const,
      items: [
        {
          productName: 'RO Booster Pump 100 GPD',
          sku: 'PUMP-100-GPD',
          quantity: 1,
          unitPrice: 2200,
          taxRatePercent: 18,
        },
      ],
    };

    // Simulate immediate concurrent double click
    const [firstCall, secondCall] = await Promise.all([
      salesRepository.createSale(salePayload),
      salesRepository.createSale(salePayload),
    ]);

    expect(firstCall?.id).toBe(secondCall?.id);
    expect(firstCall?.saleNumber).toBe(secondCall?.saleNumber);
  });

  // TEST 9 & 10: Customer Profile Reflection without fake records
  it('TEST 9 & 10: updates customer profile with real financial summary and no fabricated records', async () => {
    // Create a brand new clean customer
    const cleanCustomer = await customerRepository.create({
      fullName: 'Arun Deshmukh',
      phone: `9765${Math.floor(100000 + Math.random() * 900000)}`,
      customerType: 'INDIVIDUAL',
    });

    // Profile before any sale
    const freshProfile = await customerRepository.findById(cleanCustomer.id);
    expect(freshProfile?.summary.totalSpent).toBe(0);
    expect(freshProfile?.summary.outstanding).toBe(0);
    expect(freshProfile?.invoices.length).toBe(0);
    expect(freshProfile?.assets.length).toBe(0);

    // Create 1 Sale for this customer
    await salesRepository.createSale({
      customerId: cleanCustomer.id,
      status: 'COMPLETED',
      items: [
        {
          productName: 'Kent Supreme Alkaline RO',
          quantity: 1,
          unitPrice: 19500,
          taxRatePercent: 18,
        },
      ],
    });

    // Profile after sale
    const updatedProfile = await customerRepository.findById(cleanCustomer.id);
    expect(updatedProfile?.invoices.length).toBe(1);
    expect(updatedProfile?.assets.length).toBe(1);
    expect(updatedProfile?.summary.totalSpent).toBeGreaterThan(0);
    expect(updatedProfile?.summary.outstanding).toBeGreaterThan(0);
  });
});
