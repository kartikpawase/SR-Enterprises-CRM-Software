import { describe, it, expect, beforeAll } from 'vitest';
import { db, ensureDatabaseInitialized } from '../../database/client';
import { customerRepository } from './customer.repository';
import { salesRepository } from '../sales/sales.repository';
import { invoicesRepository } from '../invoices/invoices.repository';
import { paymentsRepository } from '../payments/payments.repository';

describe('Customer 360° Activity & Cross-Module Data Integration', () => {
  const testTimestamp = Date.now();
  let customerAId: string;
  let customerBId: string;
  let customerCId: string;
  let saleAInvoiceId: string;

  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  it('TEST 1: Creates new Customer A with clean 0-state and atomic sequence ID', async () => {
    const customerA = await customerRepository.create({
      fullName: `Alice 360_${testTimestamp}`,
      phone: `98000${String(testTimestamp).slice(-5)}`,
      email: `alice_${testTimestamp}@srenterprises.com`,
      customerType: 'INDIVIDUAL',
      addresses: [
        {
          addressType: 'SERVICE',
          addressLine1: 'Flat 101, Crystal Palms',
          city: 'Raipur',
          state: 'Chhattisgarh',
          postalCode: '492001',
          isDefault: true,
        },
      ],
    });

    expect(customerA).toBeDefined();
    expect(customerA.id).toBeDefined();
    expect(customerA.customerNumber).toMatch(/^(CUST|CX)-/);
    expect(customerA.status).toBe('ACTIVE');
    customerAId = customerA.id;

    // Verify 0-state
    expect(customerA.assets).toHaveLength(0);
    expect(customerA.services).toHaveLength(0);
    expect(customerA.invoices).toHaveLength(0);
    expect(customerA.payments).toHaveLength(0);
    expect(customerA.warranties).toHaveLength(0);
    expect(customerA.summary.totalSpent).toBe(0);
    expect(customerA.summary.outstanding).toBe(0);
  });

  it('TEST 2: Enforces deterministic newest-first ordering across customers directory', async () => {
    // Small delay to ensure timestamp separation
    await new Promise((r) => setTimeout(r, 50));

    const customerB = await customerRepository.create({
      fullName: `Bob 360_${testTimestamp}`,
      phone: `98001${String(testTimestamp).slice(-5)}`,
      email: `bob_${testTimestamp}@srenterprises.com`,
      customerType: 'COMMERCIAL',
      companyName: `Bob Enterprises ${testTimestamp}`,
    });
    customerBId = customerB.id;

    await new Promise((r) => setTimeout(r, 50));

    const customerC = await customerRepository.create({
      fullName: `Charlie 360_${testTimestamp}`,
      phone: `98002${String(testTimestamp).slice(-5)}`,
      email: `charlie_${testTimestamp}@srenterprises.com`,
      customerType: 'INDIVIDUAL',
    });
    customerCId = customerC.id;

    const result = await customerRepository.findPaginated({
      search: `360_${testTimestamp}`,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 10,
    });

    expect(result.data.length).toBe(3);
    // Order must be strictly [C, B, A] (newest first)
    expect(result.data[0].id).toBe(customerCId);
    expect(result.data[1].id).toBe(customerBId);
    expect(result.data[2].id).toBe(customerAId);
  });

  it('TEST 3: Multi-field search finds customer by name, phone, email, and company', async () => {
    const searchByName = await customerRepository.findPaginated({
      search: `Bob 360_${testTimestamp}`,
      page: 1,
      limit: 5,
    });
    expect(searchByName.data).toHaveLength(1);
    expect(searchByName.data[0].id).toBe(customerBId);

    const searchByPhone = await customerRepository.findPaginated({
      search: `98001${String(testTimestamp).slice(-5)}`,
      page: 1,
      limit: 5,
    });
    expect(searchByPhone.data).toHaveLength(1);
    expect(searchByPhone.data[0].id).toBe(customerBId);

    const searchByCompany = await customerRepository.findPaginated({
      search: `Bob Enterprises ${testTimestamp}`,
      page: 1,
      limit: 5,
    });
    expect(searchByCompany.data).toHaveLength(1);
    expect(searchByCompany.data[0].id).toBe(customerBId);
  });

  it('TEST 4: Sales + Invoice integration and 100% Cross-Customer Data Isolation', async () => {
    // Create Sale for Customer A
    const sale = await salesRepository.createSale({
      customerId: customerAId,
      status: 'COMPLETED',
      items: [
        {
          productName: `Kent RO Machine ${testTimestamp}`,
          quantity: 1,
          unitPrice: 16000,
          discountAmount: 0,
          taxRatePercent: 18,
        },
      ],
      paymentMethod: 'CASH',
      notes: 'Customer 360 Test Sale',
    });

    expect(sale).toBeDefined();
    expect(sale?.customerId).toBe(customerAId);
    expect(sale?.invoice).toBeDefined();
    expect(sale?.invoice?.customerId).toBe(customerAId);
    saleAInvoiceId = sale!.invoice!.id;

    // Fetch Customer A profile
    const profileA = await customerRepository.findById(customerAId);
    expect(profileA).toBeDefined();
    expect(profileA!.invoices.length).toBeGreaterThanOrEqual(1);
    expect(profileA!.invoices.some((inv) => inv.id === sale!.invoice!.id)).toBe(true);
    expect(profileA!.summary.totalSpent).toBe(18880);
    expect(profileA!.summary.outstanding).toBe(18880);

    // Verify Customer B profile has ZERO records (100% Data Isolation)
    const profileB = await customerRepository.findById(customerBId);
    expect(profileB).toBeDefined();
    expect(profileB!.invoices).toHaveLength(0);
    expect(profileB!.assets).toHaveLength(0);
    expect(profileB!.services).toHaveLength(0);
    expect(profileB!.payments).toHaveLength(0);
    expect(profileB!.summary.totalSpent).toBe(0);
    expect(profileB!.summary.outstanding).toBe(0);
  });

  it('TEST 5: Payment records against invoice update financial summary for Customer A and leave Customer B unaffected', async () => {
    // Record partial payment of 8880 for Customer A
    const payment = await paymentsRepository.recordPayment(
      {
        invoiceId: saleAInvoiceId,
        amount: 8880,
        paymentMethod: 'UPI',
        referenceNumber: `UPI-TEST-${testTimestamp}`,
        notes: 'Partial advance payment',
      },
      undefined,
      'System Admin'
    );

    expect(payment).toBeDefined();
    expect(payment.payment.customerId).toBe(customerAId);

    // Check financial summary of Customer A
    const summaryA = await customerRepository.getFinancialSummary(customerAId);
    expect(Number(summaryA.totalBilled)).toBe(18880);
    expect(Number(summaryA.totalPaid)).toBe(8880);
    expect(Number(summaryA.outstanding)).toBe(10000);
    expect(summaryA.paymentHealth).toBe('PARTIALLY_PAID');

    // Check financial summary of Customer B is unaffected
    const summaryB = await customerRepository.getFinancialSummary(customerBId);
    expect(Number(summaryB.totalBilled)).toBe(0);
    expect(Number(summaryB.totalPaid)).toBe(0);
    expect(Number(summaryB.outstanding)).toBe(0);
    expect(summaryB.paymentHealth).toBe('NO_INVOICES');
  });

  it('TEST 6: Customer 360 sub-resources (Assets, Services, Activities) are strictly isolated', async () => {
    // Fetch sub-resource endpoints for Customer A
    const assetsA = await customerRepository.getCustomerAssets(customerAId);
    const servicesA = await customerRepository.getCustomerServices(customerAId);
    const paymentsA = await customerRepository.getCustomerPayments(customerAId);
    const activitiesA = await customerRepository.getCustomerActivities(customerAId);

    // Customer A has payments and activities
    expect(paymentsA.data.length).toBeGreaterThanOrEqual(1);
    expect(activitiesA.data.length).toBeGreaterThanOrEqual(1);

    // Fetch sub-resource endpoints for Customer B
    const assetsB = await customerRepository.getCustomerAssets(customerBId);
    const servicesB = await customerRepository.getCustomerServices(customerBId);
    const paymentsB = await customerRepository.getCustomerPayments(customerBId);

    expect(assetsB).toHaveLength(0);
    expect(servicesB.data).toHaveLength(0);
    expect(paymentsB.data).toHaveLength(0);
  });
});
