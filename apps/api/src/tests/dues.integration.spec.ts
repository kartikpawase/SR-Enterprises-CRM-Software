import { describe, it, expect, beforeAll } from 'vitest';
import { db, ensureDatabaseInitialized } from '../database/client';
import {
  customers,
  customerAddresses,
  customerAssets,
  products,
  services,
  rentals,
  reminders,
} from '../database/schema';
import { duesRepository } from '../modules/dues/dues.repository';

describe('Date-Wise Dues Section Integration Tests', () => {
  let testCustomerId: string;
  let testAssetId: string;
  let testProductId: string;

  beforeAll(async () => {
    await ensureDatabaseInitialized();

    // 1. Create a Test Customer
    const [cust] = await db
      .insert(customers)
      .values({
        customerNumber: `CUST-DUES-${Date.now()}`,
        fullName: 'Dues Test Customer',
        phone: '9870001122',
        customerType: 'INDIVIDUAL',
      })
      .returning();
    testCustomerId = cust.id;

    // 2. Add Customer Address
    await db.insert(customerAddresses).values({
      customerId: testCustomerId,
      addressLine1: 'Plot 42, Senapati Bapat Road',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411016',
      isDefault: true,
      addressType: 'SERVICE',
    });

    // 3. Create Product & Asset
    const [prod] = await db
      .insert(products)
      .values({
        name: 'AquaGuard Royal RO+UV',
        sku: `SKU-DUES-${Date.now()}`,
        productType: 'RO_MACHINE',
        unitPrice: '15500.00',
        brand: 'Eureka Forbes',
      })
      .returning();
    testProductId = prod.id;

    const [asset] = await db
      .insert(customerAssets)
      .values({
        customerId: testCustomerId,
        productId: testProductId,
        assetType: 'RO_MACHINE',
        assetNumber: `AST-DUES-${Date.now()}`,
        serialNumber: `SN-DUES-${Date.now()}`,
        customName: 'Kitchen AquaGuard Royal RO',
        purchaseDate: new Date(),
      })
      .returning();
    testAssetId = asset.id;
  });

  it('1. Date with No Dues returns clean empty state with 0 counts', async () => {
    const result = await duesRepository.getDuesForDate('2099-01-01');

    expect(result.selectedDate).toBe('2099-01-01');
    expect(result.summary.totalActivities).toBe(0);
    expect(result.summary.servicesCount).toBe(0);
    expect(result.summary.doorstepVisitsCount).toBe(0);
    expect(result.summary.rentalPaymentsCount).toBe(0);
    expect(result.summary.otherActivitiesCount).toBe(0);
    expect(result.services).toHaveLength(0);
    expect(result.doorstepVisits).toHaveLength(0);
    expect(result.rentalPayments).toHaveLength(0);
    expect(result.otherActivities).toHaveLength(0);
  });

  it('2. Categorizes Doorstep Visits and In-Shop Services scheduled on target date', async () => {
    const targetDate = '2027-08-15';

    // Insert Doorstep Service on 15 Aug 2027
    const [srvDoorstep] = await db
      .insert(services)
      .values({
        serviceNumber: `SRV-DOOR-${Date.now()}`,
        customerId: testCustomerId,
        assetId: testAssetId,
        serviceType: 'PERIODIC_MAINTENANCE',
        serviceLocation: 'DOORSTEP',
        scheduledDate: new Date('2027-08-15T10:00:00.000Z'),
        scheduledTimeSlot: '10:00 AM - 12:00 PM',
        status: 'SCHEDULED',
        priority: 'HIGH',
        customerNotes: 'Please check filter pressure',
      })
      .returning();

    // Insert In-Shop Service on 15 Aug 2027
    const [srvShop] = await db
      .insert(services)
      .values({
        serviceNumber: `SRV-SHOP-${Date.now()}`,
        customerId: testCustomerId,
        assetId: testAssetId,
        serviceType: 'REPAIR',
        serviceLocation: 'IN_SHOP',
        scheduledDate: new Date('2027-08-15T14:30:00.000Z'),
        scheduledTimeSlot: '02:00 PM - 04:00 PM',
        status: 'SCHEDULED',
        priority: 'NORMAL',
        customerNotes: 'Membrane replacement in workshop',
      })
      .returning();

    // Insert Service on 16 Aug 2027 (Different Date)
    await db.insert(services).values({
      serviceNumber: `SRV-DIFF-${Date.now()}`,
      customerId: testCustomerId,
      assetId: testAssetId,
      serviceType: 'INSTALLATION',
      serviceLocation: 'DOORSTEP',
      scheduledDate: new Date('2027-08-16T11:00:00.000Z'),
      status: 'SCHEDULED',
    });

    const result = await duesRepository.getDuesForDate(targetDate);

    // Verify Doorstep Visits
    expect(result.summary.doorstepVisitsCount).toBeGreaterThanOrEqual(1);
    const foundDoorstep = result.doorstepVisits.find((s) => s.id === srvDoorstep.id);
    expect(foundDoorstep).toBeDefined();
    expect(foundDoorstep?.customerName).toBe('Dues Test Customer');
    expect(foundDoorstep?.customerPhone).toBe('9870001122');
    expect(foundDoorstep?.serviceType).toBe('PERIODIC_MAINTENANCE');
    expect(foundDoorstep?.serviceLocation).toBe('DOORSTEP');
    expect(foundDoorstep?.priority).toBe('HIGH');
    expect(foundDoorstep?.address).toContain('Plot 42, Senapati Bapat Road');

    // Verify Services (In-Shop)
    expect(result.summary.servicesCount).toBeGreaterThanOrEqual(1);
    const foundShop = result.services.find((s) => s.id === srvShop.id);
    expect(foundShop).toBeDefined();
    expect(foundShop?.serviceLocation).toBe('IN_SHOP');
    expect(foundShop?.customerNotes).toBe('Membrane replacement in workshop');
  });

  it('3. Captures Rental Payment Dues matching target nextDueDate', async () => {
    const targetDate = '2027-08-15';

    const [rental] = await db
      .insert(rentals)
      .values({
        rentalNumber: `RNT-DUES-${Date.now()}`,
        customerId: testCustomerId,
        machineModel: 'Commercial RO 25 LPH',
        serialNumber: `SN-RNT-${Date.now()}`,
        rentalStartDate: new Date('2027-07-15T00:00:00.000Z'),
        monthlyRent: '1200.00',
        billingAmount: '1200.00',
        outstandingAmount: '1200.00',
        nextDueDate: new Date('2027-08-15T00:00:00.000Z'),
        rentalStatus: 'ACTIVE',
        paymentStatus: 'DUE',
        billingFrequency: 'MONTHLY',
      })
      .returning();

    const result = await duesRepository.getDuesForDate(targetDate);

    expect(result.summary.rentalPaymentsCount).toBeGreaterThanOrEqual(1);
    const foundRental = result.rentalPayments.find((r) => r.id === rental.id);
    expect(foundRental).toBeDefined();
    expect(foundRental?.customerName).toBe('Dues Test Customer');
    expect(foundRental?.monthlyRent).toBe('1200.00');
    expect(foundRental?.machineModel).toBe('Commercial RO 25 LPH');
    expect(foundRental?.rentalStatus).toBe('ACTIVE');
    expect(foundRental?.paymentStatus).toBe('DUE');
  });

  it('4. Captures Other Scheduled Activities (Reminders) on target date', async () => {
    const targetDate = '2027-08-15';

    const [rem] = await db
      .insert(reminders)
      .values({
        reminderNumber: `REM-DUES-${Date.now()}`,
        customerId: testCustomerId,
        reminderType: 'SERVICE_DUE',
        reminderDate: new Date('2027-08-15T09:00:00.000Z'),
        reminderTime: '09:30 AM',
        priority: 'HIGH',
        status: 'PENDING',
        notes: 'Call customer for annual maintenance service due',
      })
      .returning();

    const result = await duesRepository.getDuesForDate(targetDate);

    expect(result.summary.otherActivitiesCount).toBeGreaterThanOrEqual(1);
    const foundRem = result.otherActivities.find((a) => a.id === rem.id);
    expect(foundRem).toBeDefined();
    expect(foundRem?.activityType).toBe('REMINDER');
    expect(foundRem?.customerName).toBe('Dues Test Customer');
    expect(foundRem?.details).toContain('09:30 AM');
    expect(foundRem?.details).toContain('annual maintenance service due');
  });

  it('5. Strict Date Isolation: Selecting 16 Aug 2027 excludes 15 Aug records', async () => {
    const result16 = await duesRepository.getDuesForDate('2027-08-16');

    // 15 Aug services must NOT appear on 16 Aug
    const hasDoorstep15 = result16.doorstepVisits.some((s) => s.customerNotes === 'Please check filter pressure');
    const hasShop15 = result16.services.some((s) => s.customerNotes === 'Membrane replacement in workshop');
    const hasRental15 = result16.rentalPayments.some((r) => r.machineModel === 'Commercial RO 25 LPH');

    expect(hasDoorstep15).toBe(false);
    expect(hasShop15).toBe(false);
    expect(hasRental15).toBe(false);

    // 16 Aug service must appear
    const hasService16 = result16.doorstepVisits.some((s) => s.serviceType === 'INSTALLATION');
    expect(hasService16).toBe(true);
  });

  it('6. Month Summary returns aggregated counts for the entire month', async () => {
    const monthSummary = await duesRepository.getMonthSummary(2027, 8);

    expect(monthSummary['2027-08-15']).toBeGreaterThanOrEqual(3);
    expect(monthSummary['2027-08-16']).toBeGreaterThanOrEqual(1);
  });
});
