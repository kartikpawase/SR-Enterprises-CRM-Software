import { describe, it, expect, beforeAll } from 'vitest';
import { salesRepository } from './sales.repository';
import { customerRepository } from '../customers/customer.repository';
import { assetsRepository } from '../assets/assets.repository';
import { servicesRepository } from '../services/services.repository';
import { ensureDatabaseInitialized } from '../../database/client';

describe('Machine & Product Identity Propagation Across Multiple Transactions Integration Tests', () => {
  let testCustomerId: string;

  beforeAll(async () => {
    await ensureDatabaseInitialized();

    const customer = await customerRepository.create({
      fullName: 'ABC Enterprise Customer',
      phone: `9822${Math.floor(100000 + Math.random() * 900000)}`,
      email: `abc.enterprise.${Date.now()}@example.com`,
      customerType: 'COMMERCIAL',
      billingAddress: {
        addressLine1: 'Industrial Zone Phase 2',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411019',
      },
    });

    testCustomerId = customer.id;
  }, 30000);

  it('preserves distinct machine/product identity across multiple sales for the same customer', async () => {
    // 1. Sale #1: RO Water Purifier Model A
    const sale1 = await salesRepository.createSale({
      customerId: testCustomerId,
      status: 'COMPLETED',
      items: [
        {
          productName: 'RO Water Purifier Model A',
          sku: 'RO-MOD-A-01',
          productType: 'RO_MACHINE',
          quantity: 1,
          unitPrice: 15000,
          serialNumber: 'SN-MOD-A-001',
          warrantyPeriodMonths: 12,
        },
      ],
    });

    expect(sale1).toBeDefined();
    expect(sale1?.items[0].productNameSnapshot).toBe('RO Water Purifier Model A');

    // 2. Sale #2: RO Water Purifier Model B
    const sale2 = await salesRepository.createSale({
      customerId: testCustomerId,
      status: 'COMPLETED',
      items: [
        {
          productName: 'RO Water Purifier Model B',
          sku: 'RO-MOD-B-02',
          productType: 'RO_MACHINE',
          quantity: 1,
          unitPrice: 22000,
          serialNumber: 'SN-MOD-B-002',
          warrantyPeriodMonths: 24,
        },
      ],
    });

    expect(sale2).toBeDefined();
    expect(sale2?.items[0].productNameSnapshot).toBe('RO Water Purifier Model B');

    // 3. Sale #3: RO Water Purifier Model C
    const sale3 = await salesRepository.createSale({
      customerId: testCustomerId,
      status: 'COMPLETED',
      items: [
        {
          productName: 'RO Water Purifier Model C',
          sku: 'RO-MOD-C-03',
          productType: 'RO_MACHINE',
          quantity: 1,
          unitPrice: 35000,
          serialNumber: 'SN-MOD-C-003',
          warrantyPeriodMonths: 36,
        },
      ],
    });

    expect(sale3).toBeDefined();
    expect(sale3?.items[0].productNameSnapshot).toBe('RO Water Purifier Model C');

    // 4. Verify Customer Sales History retains independent product names
    const customerSales = await salesRepository.findPaginated({ customerId: testCustomerId, limit: 10 });
    expect(customerSales.data.length).toBeGreaterThanOrEqual(3);

    const s1 = customerSales.data.find((s) => s.id === sale1?.id);
    const s2 = customerSales.data.find((s) => s.id === sale2?.id);
    const s3 = customerSales.data.find((s) => s.id === sale3?.id);

    expect(s1?.items[0].productNameSnapshot).toBe('RO Water Purifier Model A');
    expect(s2?.items[0].productNameSnapshot).toBe('RO Water Purifier Model B');
    expect(s3?.items[0].productNameSnapshot).toBe('RO Water Purifier Model C');

    // 5. Verify Customer Assets contains all 3 distinct machines
    const customerAssets = await customerRepository.getCustomerAssets(testCustomerId);
    expect(customerAssets.length).toBeGreaterThanOrEqual(3);

    const assetNames = customerAssets.map((a: any) => a.customName || a.product?.name);
    expect(assetNames.some((name: string) => name.includes('RO Water Purifier Model A'))).toBe(true);
    expect(assetNames.some((name: string) => name.includes('RO Water Purifier Model B'))).toBe(true);
    expect(assetNames.some((name: string) => name.includes('RO Water Purifier Model C'))).toBe(true);

    // 6. Schedule Service specifically for Model B
    const assetB = customerAssets.find((a: any) => (a.customName || a.product?.name || '').includes('Model B'));
    expect(assetB).toBeDefined();

    const result = await servicesRepository.createService({
      customerId: testCustomerId,
      assetId: assetB!.id,
      serviceType: 'PERIODIC_MAINTENANCE',
      serviceLocation: 'DOORSTEP',
      serviceClassification: 'GENERAL',
      priority: 'NORMAL',
      scheduledDate: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(result).toBeDefined();
    expect(result.service.assetId).toBe(assetB!.id);

    // Verify service query returns Model B name
    const serviceDetail = await servicesRepository.findById(result.service.id);
    expect(serviceDetail?.productName).toContain('RO Water Purifier Model B');

    // 7. Add a 4th sale and ensure previous sales and services retain their machine identities
    const sale4 = await salesRepository.createSale({
      customerId: testCustomerId,
      status: 'COMPLETED',
      items: [
        {
          productName: 'RO Water Purifier Model D',
          sku: 'RO-MOD-D-04',
          productType: 'RO_MACHINE',
          quantity: 1,
          unitPrice: 40000,
          serialNumber: 'SN-MOD-D-004',
          warrantyPeriodMonths: 12,
        },
      ],
    });

    expect(sale4?.items[0].productNameSnapshot).toBe('RO Water Purifier Model D');

    // Re-verify previous sales unchanged
    const recheckS1 = await salesRepository.findById(sale1!.id);
    const recheckS2 = await salesRepository.findById(sale2!.id);
    const recheckS3 = await salesRepository.findById(sale3!.id);
    const recheckService = await servicesRepository.findById(result.service.id);

    expect(recheckS1?.items[0].productNameSnapshot).toBe('RO Water Purifier Model A');
    expect(recheckS2?.items[0].productNameSnapshot).toBe('RO Water Purifier Model B');
    expect(recheckS3?.items[0].productNameSnapshot).toBe('RO Water Purifier Model C');
    expect(recheckService?.productName).toContain('RO Water Purifier Model B');
  });
});
