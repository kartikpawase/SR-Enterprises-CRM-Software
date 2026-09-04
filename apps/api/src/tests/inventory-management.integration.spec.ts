import { describe, it, expect, beforeAll } from 'vitest';
import { db, ensureDatabaseInitialized } from '../database/client';
import {
  inventoryItems,
  inventoryPurchases,
  inventorySales,
} from '../database/schema';
import { inventoryManagementRepository } from '../modules/inventory-management/inventory-management.repository';
import { inventoryManagementService } from '../modules/inventory-management/inventory-management.service';
import { eq } from 'drizzle-orm';

describe('Inventory Management Module (Spare Parts, Purchases, Sales & Profit Analytics)', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  it('1. Successfully creates an inventory item with baseline prices and opening stock', async () => {
    const item = await inventoryManagementService.createItem({
      name: 'Sediment Filter 10 Inch Test',
      category: 'Filter',
      brand: 'AquaFresh',
      partNumber: 'SF-10-TEST',
      purchasePrice: 200,
      sellingPrice: 350,
      initialStock: 5,
      minStockLevel: 3,
      status: 'ACTIVE',
    });

    expect(item).toBeDefined();
    expect(item.id).toBeDefined();
    expect(item.name).toBe('Sediment Filter 10 Inch Test');
    expect(item.currentStock).toBe(5);
    expect(Number(item.purchasePrice)).toBe(200);
    expect(Number(item.sellingPrice)).toBe(350);

    // Opening purchase batch created for FIFO
    const purchases = await inventoryManagementService.getPurchases({ itemId: item.id });
    expect(purchases.data.length).toBe(1);
    expect(purchases.data[0].quantity).toBe(5);
    expect(purchases.data[0].remainingQuantity).toBe(5);
    expect(Number(purchases.data[0].purchasePricePerUnit)).toBe(200);
  });

  it('2. Records an inward purchase and increments item stock properly', async () => {
    const item = await inventoryManagementService.createItem({
      name: 'RO Membrane 75 GPD Test',
      category: 'Membrane',
      brand: 'Dow Filmtec',
      partNumber: 'MEM-75-TEST',
      purchasePrice: 800,
      sellingPrice: 1500,
      initialStock: 0,
      minStockLevel: 2,
    });

    expect(item.currentStock).toBe(0);

    // Record purchase of 10 units @ 850
    const purchase = await inventoryManagementService.createPurchase({
      itemId: item.id,
      supplierName: 'Apex Water Solutions',
      purchaseDate: new Date().toISOString(),
      quantity: 10,
      purchasePricePerUnit: 850,
      notes: 'Lot #4412 Inward',
    });

    expect(purchase).toBeDefined();
    expect(purchase.quantity).toBe(10);
    expect(purchase.remainingQuantity).toBe(10);
    expect(Number(purchase.totalAmount)).toBe(8500);

    // Verify item current stock updated to 10 and baseline cost to 850
    const refreshedItem = await inventoryManagementService.getItemById(item.id);
    expect(refreshedItem.currentStock).toBe(10);
    expect(Number(refreshedItem.purchasePrice)).toBe(850);
  });

  it('3. Records an outward sale, validates stock, decrements stock, and computes profit', async () => {
    const item = await inventoryManagementService.createItem({
      name: 'Booster Pump 100 GPD Test',
      category: 'Pump',
      brand: 'Kemflo',
      partNumber: 'PUMP-100-TEST',
      purchasePrice: 1200,
      sellingPrice: 2200,
      initialStock: 5,
    });

    // Record sale of 2 units @ 2200
    const sale = await inventoryManagementService.createSale({
      itemId: item.id,
      customerName: 'Rohit Sharma',
      customerPhone: '9876543210',
      saleDate: new Date().toISOString(),
      quantity: 2,
      sellingPricePerUnit: 2200,
      notes: 'Counter delivery',
    });

    expect(sale).toBeDefined();
    expect(sale.quantity).toBe(2);
    expect(Number(sale.sellingPricePerUnit)).toBe(2200);
    expect(Number(sale.purchaseCostPerUnit)).toBe(1200);
    expect(Number(sale.totalSaleAmount)).toBe(4400); // 2 * 2200
    expect(Number(sale.totalCostAmount)).toBe(2400); // 2 * 1200
    expect(Number(sale.profit)).toBe(2000); // 4400 - 2400

    // Item stock should now be 3 (5 - 2)
    const refreshed = await inventoryManagementService.getItemById(item.id);
    expect(refreshed.currentStock).toBe(3);
  });

  it('4. Rejects sale when requested quantity exceeds available stock', async () => {
    const item = await inventoryManagementService.createItem({
      name: 'SMPS Power Supply 24V Test',
      category: 'SMPS',
      purchasePrice: 350,
      sellingPrice: 650,
      initialStock: 2,
    });

    await expect(
      inventoryManagementService.createSale({
        itemId: item.id,
        customerName: 'Anil Kumar',
        saleDate: new Date().toISOString(),
        quantity: 5, // Exceeds stock (2)
        sellingPricePerUnit: 650,
      })
    ).rejects.toThrow(/Insufficient stock/);

    // Stock should remain 2
    const refreshed = await inventoryManagementService.getItemById(item.id);
    expect(refreshed.currentStock).toBe(2);
  });

  it('5. Ensures historical transaction cost & profit remain immutable when master item price changes later', async () => {
    const item = await inventoryManagementService.createItem({
      name: 'Inline Carbon Filter Test',
      category: 'Filter',
      purchasePrice: 150,
      sellingPrice: 300,
      initialStock: 10,
    });

    // Record sale of 3 units @ 300
    const sale = await inventoryManagementService.createSale({
      itemId: item.id,
      customerName: 'Sunita Patil',
      saleDate: new Date().toISOString(),
      quantity: 3,
      sellingPricePerUnit: 300,
    });

    expect(Number(sale.purchaseCostPerUnit)).toBe(150);
    expect(Number(sale.totalCostAmount)).toBe(450);
    expect(Number(sale.profit)).toBe(450); // 900 - 450

    // Master purchase price gets updated later (e.g. supplier raises price to 220)
    await inventoryManagementService.updateItem(item.id, {
      purchasePrice: 220,
      sellingPrice: 400,
    });

    // Verify historical sale record STILL retains the original purchase cost and profit!
    const [fetchedSale] = await db
      .select()
      .from(inventorySales)
      .where(eq(inventorySales.id, sale.id));

    expect(Number(fetchedSale.purchaseCostPerUnit)).toBe(150);
    expect(Number(fetchedSale.totalCostAmount)).toBe(450);
    expect(Number(fetchedSale.profit)).toBe(450);
  });

  it('6. Accurately calculates FIFO multi-batch cost tiers when selling across different purchase prices', async () => {
    // Create item with 0 initial stock
    const item = await inventoryManagementService.createItem({
      name: 'TDS Controller Valve Test',
      category: 'Fitting',
      purchasePrice: 100,
      sellingPrice: 250,
      initialStock: 0,
    });

    // Batch 1: 5 units @ 100 on day 1
    const day1 = new Date();
    day1.setDate(day1.getDate() - 2);
    await inventoryManagementService.createPurchase({
      itemId: item.id,
      supplierName: 'Vendor A',
      purchaseDate: day1.toISOString(),
      quantity: 5,
      purchasePricePerUnit: 100,
    });

    // Batch 2: 10 units @ 140 on day 2
    const day2 = new Date();
    day2.setDate(day2.getDate() - 1);
    await inventoryManagementService.createPurchase({
      itemId: item.id,
      supplierName: 'Vendor B',
      purchaseDate: day2.toISOString(),
      quantity: 10,
      purchasePricePerUnit: 140,
    });

    // Total stock is 15. Now sell 8 units @ 300.
    // FIFO allocation:
    // Takes 5 units from Batch 1 @ 100 = 500
    // Takes 3 units from Batch 2 @ 140 = 420
    // Total Cost = 500 + 420 = 920.
    // Average Cost Per Unit = 920 / 8 = 115.
    // Total Sale = 8 * 300 = 2400.
    // Profit = 2400 - 920 = 1480.
    const sale = await inventoryManagementService.createSale({
      itemId: item.id,
      customerName: 'Vikram Joshi',
      saleDate: new Date().toISOString(),
      quantity: 8,
      sellingPricePerUnit: 300,
    });

    expect(Number(sale.purchaseCostPerUnit)).toBe(115);
    expect(Number(sale.totalCostAmount)).toBe(920);
    expect(Number(sale.totalSaleAmount)).toBe(2400);
    expect(Number(sale.profit)).toBe(1480);

    // Remaining stock on Batch 1 should be 0, and Batch 2 should have 7 remaining
    const purchases = await inventoryManagementService.getPurchases({ itemId: item.id });
    const batch1 = purchases.data.find((p) => Number(p.purchasePricePerUnit) === 100);
    const batch2 = purchases.data.find((p) => Number(p.purchasePricePerUnit) === 140);
    expect(batch1?.remainingQuantity).toBe(0);
    expect(batch2?.remainingQuantity).toBe(7);

    // Item current stock should be 7
    const refreshed = await inventoryManagementService.getItemById(item.id);
    expect(refreshed.currentStock).toBe(7);
  });

  it('7. Returns date-range filtered Analytics & KPIs', async () => {
    const analytics = await inventoryManagementService.getAnalytics({
      period: 'today',
    });

    expect(analytics).toBeDefined();
    expect(analytics.kpis).toBeDefined();
    expect(analytics.kpis.totalActiveItems).toBeGreaterThanOrEqual(5);
    expect(analytics.kpis.totalSales).toBeGreaterThan(0);
    expect(analytics.kpis.netProfit).toBeGreaterThan(0);
    expect(analytics.kpis.totalStockQuantity).toBeGreaterThan(0);
    expect(analytics.kpis.currentStockValuation).toBeGreaterThan(0);
    expect(analytics.dailySeries).toBeDefined();
  });

  it('8. Returns transaction-level Profit Ledger with unit costs and margins', async () => {
    const ledger = await inventoryManagementService.getProfitLedger({
      period: 'month',
    });

    expect(ledger.data).toBeDefined();
    expect(ledger.data.length).toBeGreaterThanOrEqual(3);
    const firstRow = ledger.data[0];
    expect(firstRow.saleNumber).toBeDefined();
    expect(firstRow.itemName).toBeDefined();
    expect(firstRow.purchaseCostPerUnit).toBeGreaterThan(0);
    expect(firstRow.sellingPricePerUnit).toBeGreaterThan(0);
    expect(firstRow.totalSaleAmount).toBeGreaterThan(0);
    expect(firstRow.marginPercent).toBeGreaterThan(0);
  });
});
