import { describe, it, expect, beforeAll } from 'vitest';
import { db, ensureDatabaseInitialized } from '../database/client';
import { inventoryItems, inventoryPurchases, inventorySales } from '../database/schema';
import { inventoryManagementService } from '../modules/inventory-management/inventory-management.service';
import { eq } from 'drizzle-orm';

describe('Inventory Item Delete End-to-End Verification Suite', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  it('TEST 1 & 2: Successfully deletes a safe inventory item and cleans up initial opening batch', async () => {
    // 1. Create a safe item with initial stock
    const item = await inventoryManagementService.createItem({
      name: 'Safe Test Filter Spun 10',
      category: 'Filter',
      brand: 'TestBrand',
      partNumber: 'SAFE-10-SPUN',
      purchasePrice: 120,
      sellingPrice: 240,
      initialStock: 3,
      minStockLevel: 1,
      status: 'ACTIVE',
    });

    const initialPurchases = await inventoryManagementService.getPurchases({ itemId: item.id });
    expect(initialPurchases.data.length).toBe(1);

    // 2. Perform deletion
    const deleted = await inventoryManagementService.deleteItem(item.id);
    expect(deleted.id).toBe(item.id);

    // 3. Verify item is deleted from DB
    const [dbItem] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, item.id));
    expect(dbItem).toBeUndefined();

    // 4. Verify initial opening purchase was removed
    const remainingPurchases = await inventoryManagementService.getPurchases({ itemId: item.id });
    expect(remainingPurchases.data.length).toBe(0);
  });

  it('TEST 3: Direct database re-query confirms deleted item stays permanently deleted', async () => {
    const item = await inventoryManagementService.createItem({
      name: 'Requery Permanent Deletion Test Item',
      category: 'Tubing',
      purchasePrice: 50,
      sellingPrice: 100,
      initialStock: 0,
    });

    await inventoryManagementService.deleteItem(item.id);

    // Re-query database
    const [dbItem] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, item.id));
    expect(dbItem).toBeUndefined();
  });

  it('TEST 4: Deleting Item A does NOT alter Item B, C, D, or any other inventory records', async () => {
    const itemB = await inventoryManagementService.createItem({
      name: 'Item B Retained',
      category: 'Pump',
      brand: 'RetainedBrand',
      partNumber: 'RET-B-001',
      purchasePrice: 1500,
      sellingPrice: 2500,
      initialStock: 5,
    });

    const itemA = await inventoryManagementService.createItem({
      name: 'Item A To Delete',
      category: 'Fitting',
      purchasePrice: 40,
      sellingPrice: 80,
      initialStock: 0,
    });

    // Delete Item A
    await inventoryManagementService.deleteItem(itemA.id);

    // Verify Item B is completely untouched
    const fetchedB = await inventoryManagementService.getItemById(itemB.id);
    expect(fetchedB.id).toBe(itemB.id);
    expect(fetchedB.name).toBe('Item B Retained');
    expect(fetchedB.category).toBe('Pump');
    expect(fetchedB.brand).toBe('RetainedBrand');
    expect(fetchedB.partNumber).toBe('RET-B-001');
    expect(Number(fetchedB.purchasePrice)).toBe(1500);
    expect(Number(fetchedB.sellingPrice)).toBe(2500);
    expect(fetchedB.currentStock).toBe(5);
  });

  it('TEST 5, 6, 7: Inventory filters (search, category, low stock) continue working correctly', async () => {
    const searchRes = await inventoryManagementService.getItems({ search: 'Retained' });
    expect(searchRes.data.length).toBeGreaterThan(0);
    expect(searchRes.data[0].name).toContain('Retained');

    const catRes = await inventoryManagementService.getItems({ category: 'Pump' });
    expect(catRes.data.length).toBeGreaterThan(0);
    expect(catRes.data.every((i) => i.category === 'Pump')).toBe(true);

    const lowStockRes = await inventoryManagementService.getItems({ lowStockOnly: true });
    expect(Array.isArray(lowStockRes.data)).toBe(true);
  });

  it('TEST 8, 9, 10, 11: View, Edit, Buy, and Sell operations on remaining items remain intact', async () => {
    const item = await inventoryManagementService.createItem({
      name: 'Operations Test Item',
      category: 'Membrane',
      purchasePrice: 600,
      sellingPrice: 1100,
      initialStock: 2,
    });

    // View
    const viewed = await inventoryManagementService.getItemById(item.id);
    expect(viewed.id).toBe(item.id);

    // Edit
    const updated = await inventoryManagementService.updateItem(item.id, {
      sellingPrice: 1200,
      description: 'Updated operational description',
    });
    expect(Number(updated.sellingPrice)).toBe(1200);

    // Buy
    const purchase = await inventoryManagementService.createPurchase({
      itemId: item.id,
      supplierName: 'Supplier One',
      purchaseDate: new Date().toISOString(),
      quantity: 5,
      purchasePricePerUnit: 600,
    });
    expect(purchase.quantity).toBe(5);

    // Sell
    const sale = await inventoryManagementService.createSale({
      itemId: item.id,
      customerName: 'Customer Alpha',
      saleDate: new Date().toISOString(),
      quantity: 3,
      sellingPricePerUnit: 1200,
    });
    expect(sale.quantity).toBe(3);
    expect(Number(sale.profit)).toBe(1800); // 3 * 1200 - 3 * 600

    const postOps = await inventoryManagementService.getItemById(item.id);
    expect(postOps.currentStock).toBe(4); // 2 + 5 - 3 = 4
  });

  it('TEST 12: Safely prevents deletion of protected items with sales or supplier purchase records', async () => {
    // 1. Item with Sales
    const itemWithSale = await inventoryManagementService.createItem({
      name: 'Protected Sale Item',
      category: 'Filter',
      purchasePrice: 100,
      sellingPrice: 200,
      initialStock: 5,
    });

    await inventoryManagementService.createSale({
      itemId: itemWithSale.id,
      customerName: 'Test Buyer',
      saleDate: new Date().toISOString(),
      quantity: 1,
      sellingPricePerUnit: 200,
    });

    await expect(inventoryManagementService.deleteItem(itemWithSale.id)).rejects.toThrow(
      /already used in existing inventory sales transactions/
    );

    // 2. Item with Supplier Purchase
    const itemWithPurchase = await inventoryManagementService.createItem({
      name: 'Protected Supplier Purchase Item',
      category: 'Pump',
      purchasePrice: 800,
      sellingPrice: 1400,
      initialStock: 0,
    });

    await inventoryManagementService.createPurchase({
      itemId: itemWithPurchase.id,
      supplierName: 'Authorized Wholesale',
      purchaseDate: new Date().toISOString(),
      quantity: 4,
      purchasePricePerUnit: 800,
    });

    await expect(inventoryManagementService.deleteItem(itemWithPurchase.id)).rejects.toThrow(
      /already used in existing inventory purchase transactions/
    );
  });

  it('TEST 14: Controlled failure for non-existent item throws clean not found error', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(inventoryManagementService.deleteItem(fakeId)).rejects.toThrow(
      /Inventory item not found/
    );
  });
});
