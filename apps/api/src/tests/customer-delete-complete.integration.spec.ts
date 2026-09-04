import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, ensureDatabaseInitialized, closeDatabaseConnections } from '../database/client';
import {
  customers,
  customerAddresses,
  customerAssets,
  sales,
  saleItems,
  invoices,
  invoiceItems,
  payments,
  services,
  jobCards,
  serviceSchedules,
  warranties,
  warrantyEvents,
  rentals,
  rentalPayments,
  rentalEvents,
  reminders,
  customerActivities,
  emailNotifications,
  products,
} from '../database/schema';
import { customerRepository } from '../modules/customers/customer.repository';
import { eq, inArray } from 'drizzle-orm';

describe('Customer Permanent Delete Complete Integration Tests', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  afterAll(async () => {
    await closeDatabaseConnections();
  });

  it('1. Empty-Record Customer: deletes customer with no records cleanly without internal server error', async () => {
    // Create empty customer
    const [emptyCust] = await db
      .insert(customers)
      .values({
        customerNumber: 'CX-DEL-TEST-001',
        fullName: 'Empty Customer Test',
        phone: '9870000001',
        customerType: 'INDIVIDUAL',
        status: 'ACTIVE',
      })
      .returning();

    expect(emptyCust).toBeDefined();
    expect(emptyCust.id).toBeDefined();

    // Verify exists
    const fetchedBefore = await customerRepository.findById(emptyCust.id);
    expect(fetchedBefore).toBeDefined();
    expect(fetchedBefore?.id).toBe(emptyCust.id);

    // Perform permanent deletion
    const result = await customerRepository.deleteCustomerCompletely(emptyCust.id);
    expect(result).toBeDefined();
    expect(result.deleted).toBe(true);
    expect(result.id).toBe(emptyCust.id);

    // Verify customer is permanently deleted
    const fetchedAfter = await customerRepository.findById(emptyCust.id);
    expect(fetchedAfter).toBeNull();
  });

  it('2. Customer with Full Suite of Associated Records: deletes customer and all related records atomically', async () => {
    const timestamp = Date.now();

    // 1. Create customer
    const [cust] = await db
      .insert(customers)
      .values({
        customerNumber: `CX-FULL-${timestamp}`,
        fullName: 'Full Record Customer',
        phone: '9870000002',
        email: `full_cust_${timestamp}@example.com`,
        customerType: 'COMMERCIAL',
        companyName: 'Full Test Corp',
        status: 'ACTIVE',
      })
      .returning();

    const custId = cust.id;

    // 2. Customer address
    await db.insert(customerAddresses).values({
      customerId: custId,
      addressLine1: '123 Test Street',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      isDefault: true,
    });

    // 3. Customer asset & catalog product
    const [prod] = await db
      .insert(products)
      .values({
        sku: `SKU-FULL-${timestamp}`,
        name: 'RO Unit Premium Catalog',
        productType: 'RO_MACHINE',
        brand: 'SR Enterprises',
        unitPrice: '25000.00',
      })
      .returning();

    const [asset] = await db
      .insert(customerAssets)
      .values({
        assetNumber: `ASSET-FULL-${timestamp}`,
        customerId: custId,
        productId: prod.id,
        assetType: 'RO_MACHINE',
        customName: 'RO Purifier Unit Full Test',
        serialNumber: `SN-FULL-${timestamp}`,
        purchaseDate: new Date(),
        status: 'ACTIVE',
      })
      .returning();

    // 4. Sales order & items
    const [sale] = await db
      .insert(sales)
      .values({
        saleNumber: `SO-FULL-${timestamp}`,
        customerId: custId,
        saleDate: new Date(),
        status: 'COMPLETED',
        subtotal: '25000.00',
        totalAmount: '25000.00',
      })
      .returning();

    await db.insert(saleItems).values({
      saleId: sale.id,
      productId: prod.id,
      productNameSnapshot: 'RO Unit Premium',
      skuSnapshot: prod.sku,
      quantity: 1,
      unitPriceSnapshot: '25000.00',
      lineTotal: '25000.00',
    });

    // 5. Invoices & Invoice Items
    const [inv] = await db
      .insert(invoices)
      .values({
        invoiceNumber: `INV-FULL-${timestamp}`,
        customerId: custId,
        saleId: sale.id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 864000000),
        status: 'PARTIALLY_PAID',
        subtotal: '25000.00',
        totalAmount: '25000.00',
      })
      .returning();

    await db.insert(invoiceItems).values({
      invoiceId: inv.id,
      productId: prod.id,
      itemType: 'PRODUCT',
      nameSnapshot: 'RO Unit Premium',
      quantity: 1,
      unitPriceSnapshot: '25000.00',
      lineTotal: '25000.00',
    });

    // 6. Payments
    await db.insert(payments).values({
      paymentNumber: `PAY-FULL-${timestamp}`,
      customerId: custId,
      invoiceId: inv.id,
      amount: '10000.00',
      paymentMethod: 'UPI',
      status: 'COMPLETED',
      paymentDate: new Date(),
    });

    // 7. Warranties & Warranty Events
    const [war] = await db
      .insert(warranties)
      .values({
        warrantyNumber: `WAR-FULL-${timestamp}`,
        customerId: custId,
        assetId: asset.id,
        saleId: sale.id,
        warrantyType: 'STANDARD_MACHINE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 31536000000),
        durationMonths: 12,
        status: 'ACTIVE',
      })
      .returning();

    await db.insert(warrantyEvents).values({
      warrantyId: war.id,
      customerId: custId,
      assetId: asset.id,
      eventType: 'ACTIVATED',
      eventDate: new Date(),
    });

    // 8. Services, Job Cards, Service Schedules
    const [srv] = await db
      .insert(services)
      .values({
        serviceNumber: `SRV-FULL-${timestamp}`,
        customerId: custId,
        assetId: asset.id,
        warrantyId: war.id,
        serviceType: 'PERIODIC_MAINTENANCE',
        serviceLocation: 'DOORSTEP',
        serviceClassification: 'GENERAL',
        scheduledDate: new Date(),
        status: 'SCHEDULED',
        priority: 'NORMAL',
      })
      .returning();

    await db.insert(jobCards).values({
      jobCardNumber: `JC-FULL-${timestamp}`,
      serviceId: srv.id,
      customerId: custId,
      assetId: asset.id,
      status: 'SCHEDULED',
    });

    await db.insert(serviceSchedules).values({
      customerId: custId,
      assetId: asset.id,
      warrantyId: war.id,
      scheduleIndex: 1,
      totalSchedules: 4,
      plannedDate: new Date(),
      targetMonth: '2026-09',
      generatedServiceId: srv.id,
      status: 'SERVICE_CREATED',
    });

    // 9. Rentals, Rental Payments, Rental Events
    const [rnt] = await db
      .insert(rentals)
      .values({
        rentalNumber: `RNT-FULL-${timestamp}`,
        customerId: custId,
        machineModel: 'Commercial RO 50LPH',
        serialNumber: `SN-RNT-${timestamp}`,
        rentalStartDate: new Date(),
        monthlyRent: '2000.00',
        billingAmount: '2000.00',
        nextDueDate: new Date(Date.now() + 2592000000),
        rentalStatus: 'ACTIVE',
        paymentStatus: 'PAID',
      })
      .returning();

    await db.insert(rentalPayments).values({
      rentalId: rnt.id,
      customerId: custId,
      amount: '2000.00',
      paymentMethod: 'UPI',
    });

    await db.insert(rentalEvents).values({
      rentalId: rnt.id,
      eventType: 'CREATED',
      description: 'Rental agreement initiated',
    });

    // 10. Reminders, Customer Activities, Email Notifications
    await db.insert(reminders).values({
      reminderNumber: `REM-FULL-${timestamp}`,
      customerId: custId,
      invoiceId: inv.id,
      reminderType: 'INVOICE_DUE',
      reminderDate: new Date(),
      status: 'PENDING',
    });

    await db.insert(customerActivities).values({
      customerId: custId,
      eventType: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: custId,
      description: 'Customer profile configured',
    });

    await db.insert(emailNotifications).values({
      recipientEmail: `full_cust_${timestamp}@example.com`,
      customerId: custId,
      eventType: 'INVOICE_EMAIL',
      subject: 'Your Invoice',
    });

    // Verify all records exist prior to deletion
    const checkCust = await customerRepository.findById(custId);
    expect(checkCust).toBeDefined();

    // Perform permanent deletion
    const delResult = await customerRepository.deleteCustomerCompletely(custId);
    expect(delResult.deleted).toBe(true);
    expect(delResult.id).toBe(custId);

    // Verify customer is gone
    const afterCust = await customerRepository.findById(custId);
    expect(afterCust).toBeNull();

    // Verify all associated records are completely deleted
    const remainingSales = await db.select().from(sales).where(eq(sales.customerId, custId));
    expect(remainingSales.length).toBe(0);

    const remainingInvoices = await db.select().from(invoices).where(eq(invoices.customerId, custId));
    expect(remainingInvoices.length).toBe(0);

    const remainingPayments = await db.select().from(payments).where(eq(payments.customerId, custId));
    expect(remainingPayments.length).toBe(0);

    const remainingServices = await db.select().from(services).where(eq(services.customerId, custId));
    expect(remainingServices.length).toBe(0);

    const remainingJobCards = await db.select().from(jobCards).where(eq(jobCards.customerId, custId));
    expect(remainingJobCards.length).toBe(0);

    const remainingAssets = await db.select().from(customerAssets).where(eq(customerAssets.customerId, custId));
    expect(remainingAssets.length).toBe(0);

    const remainingWarranties = await db.select().from(warranties).where(eq(warranties.customerId, custId));
    expect(remainingWarranties.length).toBe(0);

    const remainingRentals = await db.select().from(rentals).where(eq(rentals.customerId, custId));
    expect(remainingRentals.length).toBe(0);

    const remainingRentalPayments = await db.select().from(rentalPayments).where(eq(rentalPayments.customerId, custId));
    expect(remainingRentalPayments.length).toBe(0);

    const remainingReminders = await db.select().from(reminders).where(eq(reminders.customerId, custId));
    expect(remainingReminders.length).toBe(0);

    const remainingActivities = await db.select().from(customerActivities).where(eq(customerActivities.customerId, custId));
    expect(remainingActivities.length).toBe(0);

    const remainingAddresses = await db.select().from(customerAddresses).where(eq(customerAddresses.customerId, custId));
    expect(remainingAddresses.length).toBe(0);
  });

  it('3. Data Isolation: Deleting Customer A leaves Customer B completely unaffected', async () => {
    const timestamp = Date.now();

    // 1. Create Customer A
    const [custA] = await db
      .insert(customers)
      .values({
        customerNumber: `CX-ISO-A-${timestamp}`,
        fullName: 'Customer A To Delete',
        phone: '9870000003',
        customerType: 'INDIVIDUAL',
        status: 'ACTIVE',
      })
      .returning();

    // Create Sale, Invoice, Payment for Customer A
    const [saleA] = await db
      .insert(sales)
      .values({
        saleNumber: `SO-A-${timestamp}`,
        customerId: custA.id,
        saleDate: new Date(),
        status: 'COMPLETED',
        subtotal: '10000.00',
        totalAmount: '10000.00',
      })
      .returning();

    const [invA] = await db
      .insert(invoices)
      .values({
        invoiceNumber: `INV-A-${timestamp}`,
        customerId: custA.id,
        saleId: saleA.id,
        invoiceDate: new Date(),
        dueDate: new Date(),
        status: 'PAID',
        subtotal: '10000.00',
        totalAmount: '10000.00',
      })
      .returning();

    await db.insert(payments).values({
      paymentNumber: `PAY-A-${timestamp}`,
      customerId: custA.id,
      invoiceId: invA.id,
      amount: '10000.00',
      paymentMethod: 'UPI',
      status: 'COMPLETED',
      paymentDate: new Date(),
    });

    // 2. Create Customer B
    const [custB] = await db
      .insert(customers)
      .values({
        customerNumber: `CX-ISO-B-${timestamp}`,
        fullName: 'Customer B Untouched',
        phone: '9870000004',
        customerType: 'INDIVIDUAL',
        status: 'ACTIVE',
      })
      .returning();

    // Create Sale, Invoice, Payment, Asset, Service for Customer B
    const [saleB] = await db
      .insert(sales)
      .values({
        saleNumber: `SO-B-${timestamp}`,
        customerId: custB.id,
        saleDate: new Date(),
        status: 'COMPLETED',
        subtotal: '18000.00',
        totalAmount: '18000.00',
      })
      .returning();

    const [invB] = await db
      .insert(invoices)
      .values({
        invoiceNumber: `INV-B-${timestamp}`,
        customerId: custB.id,
        saleId: saleB.id,
        invoiceDate: new Date(),
        dueDate: new Date(),
        status: 'PARTIALLY_PAID',
        subtotal: '18000.00',
        totalAmount: '18000.00',
      })
      .returning();

    const [payB] = await db
      .insert(payments)
      .values({
        paymentNumber: `PAY-B-${timestamp}`,
        customerId: custB.id,
        invoiceId: invB.id,
        amount: '8000.00',
        paymentMethod: 'UPI',
        status: 'COMPLETED',
        paymentDate: new Date(),
      })
      .returning();

    const [prodB] = await db
      .insert(products)
      .values({
        sku: `SKU-B-${timestamp}`,
        name: 'RO Unit Customer B',
        productType: 'RO_MACHINE',
        brand: 'SR Enterprises',
        unitPrice: '18000.00',
      })
      .returning();

    const [assetB] = await db
      .insert(customerAssets)
      .values({
        assetNumber: `ASSET-B-${timestamp}`,
        customerId: custB.id,
        productId: prodB.id,
        assetType: 'RO_MACHINE',
        customName: 'Customer B Water Purifier',
        serialNumber: `SN-B-${timestamp}`,
        purchaseDate: new Date(),
        status: 'ACTIVE',
      })
      .returning();

    const [srvB] = await db
      .insert(services)
      .values({
        serviceNumber: `SRV-B-${timestamp}`,
        customerId: custB.id,
        assetId: assetB.id,
        serviceType: 'PERIODIC_MAINTENANCE',
        serviceLocation: 'DOORSTEP',
        serviceClassification: 'GENERAL',
        scheduledDate: new Date(),
        status: 'SCHEDULED',
        priority: 'NORMAL',
      })
      .returning();

    // 3. Delete Customer A ONLY
    const result = await customerRepository.deleteCustomerCompletely(custA.id);
    expect(result.deleted).toBe(true);
    expect(result.id).toBe(custA.id);

    // Verify Customer A is deleted
    const checkCustA = await customerRepository.findById(custA.id);
    expect(checkCustA).toBeNull();

    const checkSaleA = await db.select().from(sales).where(eq(sales.customerId, custA.id));
    expect(checkSaleA.length).toBe(0);

    const checkInvA = await db.select().from(invoices).where(eq(invoices.customerId, custA.id));
    expect(checkInvA.length).toBe(0);

    // 4. Verify Customer B and all Customer B records are 100% UNTOUCHED
    const checkCustB = await customerRepository.findById(custB.id);
    expect(checkCustB).toBeDefined();
    expect(checkCustB?.fullName).toBe('Customer B Untouched');

    const checkSaleB = await db.select().from(sales).where(eq(sales.id, saleB.id));
    expect(checkSaleB.length).toBe(1);
    expect(checkSaleB[0].saleNumber).toBe(`SO-B-${timestamp}`);

    const checkInvB = await db.select().from(invoices).where(eq(invoices.id, invB.id));
    expect(checkInvB.length).toBe(1);
    expect(checkInvB[0].totalAmount).toBe('18000.00');

    const checkPayB = await db.select().from(payments).where(eq(payments.id, payB.id));
    expect(checkPayB.length).toBe(1);
    expect(checkPayB[0].amount).toBe('8000.00');

    const checkAssetB = await db.select().from(customerAssets).where(eq(customerAssets.id, assetB.id));
    expect(checkAssetB.length).toBe(1);

    const checkSrvB = await db.select().from(services).where(eq(services.id, srvB.id));
    expect(checkSrvB.length).toBe(1);
  });
});
