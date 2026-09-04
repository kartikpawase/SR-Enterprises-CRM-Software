import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, ensureDatabaseInitialized, closeDatabaseConnections } from '../database/client';
import { salesRepository } from '../modules/sales/sales.repository';
import { servicesRepository } from '../modules/services/services.repository';
import { paymentsRepository } from '../modules/payments/payments.repository';
import { customerRepository } from '../modules/customers/customer.repository';
import { productRepository } from '../modules/products/product.repository';

describe('Direct Sale Order + Service Page Record Payment Integration Tests', () => {
  let customerAId: string;
  let customerBId: string;
  let testProductId: string;

  beforeAll(async () => {
    await ensureDatabaseInitialized();

    // Ensure test product exists
    const randSku = `SKU-TEST-${Date.now().toString().slice(-4)}`;
    const product = await productRepository.create({
      name: 'SR Aqua Grand RO Purifier',
      sku: randSku,
      brand: 'SR Enterprises',
      productType: 'RO_MACHINE',
      unitPrice: 16500,
      taxRatePercent: 0,
      defaultWarrantyMonths: 12,
      defaultServiceIntervalMonths: 4,
    });
    testProductId = product.id;

    // Create Customer A
    const custA = await customerRepository.create({
      fullName: 'Vikramaditya Singhania',
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `vikram.${Date.now()}@example.com`,
      customerType: 'INDIVIDUAL',
    });
    customerAId = custA.id;

    // Create Customer B for multi-transaction isolation tests
    const custB = await customerRepository.create({
      fullName: 'Dr. Ananya Deshmukh',
      phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `ananya.${Date.now()}@example.com`,
      customerType: 'COMMERCIAL',
    });
    customerBId = custB.id;
  });

  afterAll(async () => {
    await closeDatabaseConnections();
  });

  describe('Direct Sale Order — Payment Recording Flow', () => {
    let saleAId: string;
    let invoiceAId: string;

    it('1. should create Direct Sale Order in initial Payment Pending state', async () => {
      const sale = await salesRepository.createSale({
        customerId: customerAId,
        status: 'COMPLETED',
        items: [
          {
            productId: testProductId,
            quantity: 1,
            unitPrice: 16500,
            taxRatePercent: 0,
            discountAmount: 0,
            warrantyPeriodMonths: 12,
          },
        ],
      });

      expect(sale).toBeDefined();
      expect(sale.id).toBeDefined();
      saleAId = sale.id;

      const saleDetail = await salesRepository.findById(sale.id);
      expect(saleDetail).toBeDefined();
      expect(saleDetail!.invoice).toBeDefined();
      invoiceAId = saleDetail!.invoice!.id;

      expect(parseFloat(saleDetail!.totalAmount)).toBe(16500);
      expect(parseFloat(saleDetail!.paidAmount)).toBe(0);
      expect(parseFloat(saleDetail!.outstandingAmount)).toBe(16500);
      expect(saleDetail!.paymentStatus).toBe('PENDING');
      expect(saleDetail!.payments).toHaveLength(0);
    });

    it('2. should record partial payment (₹5,000) and transition sale to Partially Paid', async () => {
      const paymentRes = await paymentsRepository.recordPayment({
        invoiceId: invoiceAId,
        amount: 5000,
        paymentMethod: 'UPI',
        referenceNumber: 'UPI-TXN-5000-01',
        notes: 'First installment via GPay',
      });

      expect(paymentRes).toBeDefined();
      expect(paymentRes.payment).toBeDefined();
      expect(paymentRes.payment.paymentNumber).toMatch(/^PAY-\d{4}-\d+$/);
      expect(parseFloat(paymentRes.payment.amount)).toBe(5000);
      expect(paymentRes.payment.status).toBe('COMPLETED');
      expect(paymentRes.newInvoiceStatus).toBe('PARTIALLY_PAID');
      expect(paymentRes.remainingOutstanding).toBe(11500);

      // Check updated sale order detail
      const updatedSale = await salesRepository.findById(saleAId);
      expect(updatedSale).toBeDefined();
      expect(parseFloat(updatedSale!.totalAmount)).toBe(16500);
      expect(parseFloat(updatedSale!.paidAmount)).toBe(5000);
      expect(parseFloat(updatedSale!.outstandingAmount)).toBe(11500);
      expect(updatedSale!.paymentStatus).toBe('PARTIALLY_PAID');
      expect(updatedSale!.invoice!.status).toBe('PARTIALLY_PAID');
      expect(updatedSale!.payments).toHaveLength(1);
      expect(updatedSale!.payments[0].referenceNumber).toBe('UPI-TXN-5000-01');
    });

    it('3. should record remaining installment (₹11,500) and transition sale to Payment Complete', async () => {
      const paymentRes2 = await paymentsRepository.recordPayment({
        invoiceId: invoiceAId,
        amount: 11500,
        paymentMethod: 'CASH',
        referenceNumber: 'CASH-REC-11500',
        notes: 'Final settlement cash payment on delivery',
      });

      expect(paymentRes2).toBeDefined();
      expect(paymentRes2.payment).toBeDefined();
      expect(parseFloat(paymentRes2.payment.amount)).toBe(11500);
      expect(paymentRes2.newInvoiceStatus).toBe('PAID');
      expect(paymentRes2.remainingOutstanding).toBe(0);

      // Check updated sale order detail
      const finalSale = await salesRepository.findById(saleAId);
      expect(finalSale).toBeDefined();
      expect(parseFloat(finalSale!.totalAmount)).toBe(16500);
      expect(parseFloat(finalSale!.paidAmount)).toBe(16500);
      expect(parseFloat(finalSale!.outstandingAmount)).toBe(0);
      expect(finalSale!.paymentStatus).toBe('PAID');
      expect(finalSale!.invoice!.status).toBe('PAID');

      // Verify multiple installments are preserved in history without overwriting
      expect(finalSale!.payments).toHaveLength(2);
      const amounts = finalSale!.payments.map((p) => parseFloat(p.amount));
      expect(amounts).toContain(5000);
      expect(amounts).toContain(11500);
    });

    it('4. should reject overpayment exceeding remaining balance', async () => {
      let threwError = false;
      try {
        await paymentsRepository.recordPayment({
          invoiceId: invoiceAId,
          amount: 500,
          paymentMethod: 'CASH',
        });
      } catch (err: any) {
        threwError = true;
        expect(err.code).toBe('PAYMENT_EXCEEDS_OUTSTANDING');
      }
      expect(threwError).toBe(true);
    });
  });

  describe('Service Page — Payment Recording Flow', () => {
    let serviceId: string;
    let serviceInvoiceId: string;

    it('1. should complete service with billable charges (₹1,500) and generate service invoice', async () => {
      // Create service
      const scheduled = await servicesRepository.createService({
        customerId: customerAId,
        serviceType: 'REPAIR',
        serviceLocation: 'DOORSTEP',
        serviceClassification: 'GENERAL',
        priority: 'NORMAL',
        scheduledDate: new Date().toISOString(),
        customerNotes: 'Low flow and pressure pump vibration',
      });

      expect(scheduled.service).toBeDefined();
      serviceId = scheduled.service.id;

      // Complete service with ₹500 labor + ₹1000 parts = ₹1,500
      const completed = await servicesRepository.completeService(serviceId, {
        workPerformed: 'Replaced booster pump head and descaled membrane',
        laborCharges: 500,
        partsCharges: 1000,
        totalCharges: 1500,
        partsReplaced: [
          {
            partName: 'Booster Pump Head Assembly',
            partSku: 'PMP-HEAD-01',
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      });

      expect(completed.service.status).toBe('COMPLETED');
      expect(completed.invoice).toBeDefined();
      serviceInvoiceId = completed.invoice.id;

      // Verify findById returns service with invoice and payment status
      const srvDetail = await servicesRepository.findById(serviceId);
      expect(srvDetail).toBeDefined();
      expect(srvDetail!.invoice).toBeDefined();
      expect(parseFloat(srvDetail!.invoice!.totalAmount)).toBe(1500);
      expect(parseFloat(srvDetail!.paidAmount)).toBe(0);
      expect(parseFloat(srvDetail!.outstandingAmount)).toBe(1500);
      expect(srvDetail!.paymentStatus).toBe('PENDING');
    });

    it('2. should record payment against service invoice and transition service to Payment Complete', async () => {
      const srvPayment = await paymentsRepository.recordPayment({
        invoiceId: serviceInvoiceId,
        amount: 1500,
        paymentMethod: 'UPI',
        referenceNumber: 'UPI-SRV-1500-DONE',
        notes: 'Doorstep service payment collected by technician',
      });

      expect(srvPayment).toBeDefined();
      expect(srvPayment.payment).toBeDefined();
      expect(parseFloat(srvPayment.payment.amount)).toBe(1500);
      expect(srvPayment.newInvoiceStatus).toBe('PAID');

      // Verify service detail has updated payment status and payments list
      const srvDetail = await servicesRepository.findById(serviceId);
      expect(srvDetail).toBeDefined();
      expect(parseFloat(srvDetail!.paidAmount)).toBe(1500);
      expect(parseFloat(srvDetail!.outstandingAmount)).toBe(0);
      expect(srvDetail!.paymentStatus).toBe('PAID');
      expect(srvDetail!.invoice!.status).toBe('PAID');
      expect(srvDetail!.payments).toHaveLength(1);
      expect(srvDetail!.payments[0].referenceNumber).toBe('UPI-SRV-1500-DONE');
    });
  });

  describe('Strict Transaction Isolation & Multi-Order Customer Verification', () => {
    let sale1Id: string;
    let sale2Id: string;
    let service1Id: string;
    let service2Id: string;
    let sale1InvId: string;
    let service1InvId: string;

    it('1. should setup 2 Sales and 2 Services for Customer B', async () => {
      // Sale 1: ₹10,000
      const s1 = await salesRepository.createSale({
        customerId: customerBId,
        status: 'COMPLETED',
        items: [{ productId: testProductId, quantity: 1, unitPrice: 10000, taxRatePercent: 0, discountAmount: 0 }],
      });
      sale1Id = s1.id;
      const s1Detail = await salesRepository.findById(sale1Id);
      sale1InvId = s1Detail!.invoice!.id;

      // Sale 2: ₹20,000
      const s2 = await salesRepository.createSale({
        customerId: customerBId,
        status: 'COMPLETED',
        items: [{ productId: testProductId, quantity: 2, unitPrice: 10000, taxRatePercent: 0, discountAmount: 0 }],
      });
      sale2Id = s2.id;

      // Service 1: ₹2,500
      const srv1 = await servicesRepository.createService({
        customerId: customerBId,
        serviceType: 'INSTALLATION',
        serviceLocation: 'DOORSTEP',
        serviceClassification: 'GENERAL',
        priority: 'NORMAL',
        scheduledDate: new Date().toISOString(),
      });
      service1Id = srv1.service.id;
      const srv1Comp = await servicesRepository.completeService(service1Id, {
        workPerformed: 'Standard installation and commissioning',
        laborCharges: 2500,
        partsCharges: 0,
        totalCharges: 2500,
      });
      service1InvId = srv1Comp.invoice.id;

      // Service 2: ₹3,500
      const srv2 = await servicesRepository.createService({
        customerId: customerBId,
        serviceType: 'REPAIR',
        serviceLocation: 'DOORSTEP',
        serviceClassification: 'GENERAL',
        priority: 'HIGH',
        scheduledDate: new Date().toISOString(),
      });
      service2Id = srv2.service.id;
      await servicesRepository.completeService(service2Id, {
        workPerformed: 'Full overhaul',
        laborCharges: 1500,
        partsCharges: 2000,
        totalCharges: 3500,
      });
    });

    it('2. should record payment on Sale 1 and Service 1 without cross-linking or affecting other orders', async () => {
      // Pay ₹4,000 on Sale 1
      await paymentsRepository.recordPayment({
        invoiceId: sale1InvId,
        amount: 4000,
        paymentMethod: 'UPI',
        referenceNumber: 'ISOLATION-SALE-4K',
      });

      // Pay ₹2,500 on Service 1
      await paymentsRepository.recordPayment({
        invoiceId: service1InvId,
        amount: 2500,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'ISOLATION-SRV-2500',
      });

      // Verify Sale 1
      const s1 = await salesRepository.findById(sale1Id);
      expect(parseFloat(s1!.paidAmount)).toBe(4000);
      expect(parseFloat(s1!.outstandingAmount)).toBe(6000);
      expect(s1!.paymentStatus).toBe('PARTIALLY_PAID');
      expect(s1!.payments).toHaveLength(1);
      expect(s1!.payments[0].referenceNumber).toBe('ISOLATION-SALE-4K');

      // Verify Sale 2 (Untouched)
      const s2 = await salesRepository.findById(sale2Id);
      expect(parseFloat(s2!.paidAmount)).toBe(0);
      expect(parseFloat(s2!.outstandingAmount)).toBe(20000);
      expect(s2!.paymentStatus).toBe('PENDING');
      expect(s2!.payments).toHaveLength(0);

      // Verify Service 1
      const srv1 = await servicesRepository.findById(service1Id);
      expect(parseFloat(srv1!.paidAmount)).toBe(2500);
      expect(parseFloat(srv1!.outstandingAmount)).toBe(0);
      expect(srv1!.paymentStatus).toBe('PAID');
      expect(srv1!.payments).toHaveLength(1);
      expect(srv1!.payments[0].referenceNumber).toBe('ISOLATION-SRV-2500');

      // Verify Service 2 (Untouched)
      const srv2 = await servicesRepository.findById(service2Id);
      expect(parseFloat(srv2!.paidAmount)).toBe(0);
      expect(parseFloat(srv2!.outstandingAmount)).toBe(3500);
      expect(srv2!.paymentStatus).toBe('PENDING');
      expect(srv2!.payments).toHaveLength(0);
    });

    it('3. should verify customer financial ledger aggregates all isolated transactions correctly', async () => {
      const summary = await paymentsRepository.getCustomerFinancialSummary(customerBId);

      // Total Billed: 10,000 (Sale 1) + 20,000 (Sale 2) + 2,500 (Service 1) + 3,500 (Service 2) = 36,000
      expect(summary.totalBilled).toBe(36000);
      // Total Paid: 4,000 (Sale 1) + 2,500 (Service 1) = 6,500
      expect(summary.totalPaid).toBe(6500);
      // Outstanding: 36,000 - 6,500 = 29,500
      expect(summary.totalOutstanding).toBe(29500);
      expect(summary.recentPayments).toHaveLength(2);
    });
  });
});
