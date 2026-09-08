import { eq, and, gte, lte, desc, asc, sql, ilike } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  inventoryItems,
  inventoryPurchases,
  inventorySales,
  customers,
} from '../../database/schema';
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  InventoryItemQueryFilter,
  CreateInventoryPurchaseInput,
  InventoryPurchaseQueryFilter,
  CreateInventorySaleInput,
  InventorySaleQueryFilter,
  InventoryAnalyticsFilter,
  InventoryProfitLedgerFilter,
} from '@crm/validation';

export class InventoryManagementRepository {
  /**
   * Helper to format currency values safely
   */
  private round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  // =========================================================================
  // INVENTORY ITEMS (MASTER)
  // =========================================================================

  async getItems(filters: InventoryItemQueryFilter) {
    const conditions: any[] = [];

    if (filters.status && filters.status !== 'ALL') {
      conditions.push(eq(inventoryItems.status, filters.status));
    }

    if (filters.category && filters.category !== 'ALL') {
      conditions.push(eq(inventoryItems.category, filters.category));
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        sql`(${inventoryItems.name} ILIKE ${term} OR ${inventoryItems.brand} ILIKE ${term} OR ${inventoryItems.partNumber} ILIKE ${term})`
      );
    }

    if (filters.lowStockOnly) {
      conditions.push(sql`${inventoryItems.currentStock} <= ${inventoryItems.minStockLevel}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const data = await db
      .select()
      .from(inventoryItems)
      .where(whereClause)
      .orderBy(asc(inventoryItems.name))
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getItemById(id: string) {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    if (!item) return null;

    // Recent 10 purchases
    const recentPurchases = await db
      .select()
      .from(inventoryPurchases)
      .where(eq(inventoryPurchases.itemId, id))
      .orderBy(desc(inventoryPurchases.purchaseDate), desc(inventoryPurchases.createdAt))
      .limit(10);

    // Recent 10 sales
    const recentSales = await db
      .select()
      .from(inventorySales)
      .where(eq(inventorySales.itemId, id))
      .orderBy(desc(inventorySales.saleDate), desc(inventorySales.createdAt))
      .limit(10);

    return {
      ...item,
      recentPurchases,
      recentSales,
    };
  }

  async createItem(input: CreateInventoryItemInput) {
    const initialStock = Number(input.initialStock) || 0;
    const purchasePrice = Number(input.purchasePrice) || 0;
    const sellingPrice = Number(input.sellingPrice) || 0;
    const minStockLevel = Number(input.minStockLevel) || 0;

    const [newItem] = await db
      .insert(inventoryItems)
      .values({
        name: input.name.trim(),
        category: input.category.trim(),
        brand: input.brand?.trim() || null,
        partNumber: input.partNumber?.trim() || null,
        description: input.description?.trim() || null,
        purchasePrice: purchasePrice.toFixed(2),
        sellingPrice: sellingPrice.toFixed(2),
        currentStock: initialStock,
        minStockLevel,
        status: input.status || 'ACTIVE',
      })
      .returning();

    // If initial stock was provided upon item creation, record an opening purchase batch for FIFO integrity
    if (initialStock > 0) {
      const year = new Date().getFullYear();
      const uniqueSuffix = `${newItem.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const purchaseNumber = `PUR-${year}-INIT-${uniqueSuffix}`;
      await db.insert(inventoryPurchases).values({
        purchaseNumber,
        itemId: newItem.id,
        supplierName: 'Opening Stock',
        purchaseDate: new Date(),
        quantity: initialStock,
        remainingQuantity: initialStock,
        purchasePricePerUnit: purchasePrice.toFixed(2),
        totalAmount: (initialStock * purchasePrice).toFixed(2),
        notes: 'Initial opening stock batch',
      });
    }

    return newItem;
  }

  async updateItem(id: string, input: UpdateInventoryItemInput) {
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.category !== undefined) updateData.category = input.category.trim();
    if (input.brand !== undefined) updateData.brand = input.brand?.trim() || null;
    if (input.partNumber !== undefined) updateData.partNumber = input.partNumber?.trim() || null;
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.purchasePrice !== undefined) updateData.purchasePrice = Number(input.purchasePrice).toFixed(2);
    if (input.sellingPrice !== undefined) updateData.sellingPrice = Number(input.sellingPrice).toFixed(2);
    if (input.minStockLevel !== undefined) updateData.minStockLevel = Number(input.minStockLevel);
    if (input.status !== undefined) updateData.status = input.status;

    const [updated] = await db
      .update(inventoryItems)
      .set(updateData)
      .where(eq(inventoryItems.id, id))
      .returning();

    return updated;
  }

  async deleteItem(id: string) {
    // 1. Verify item exists
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    if (!item) {
      throw new Error('Inventory item not found');
    }

    // 2. Check if item is referenced in sales transactions
    const [salesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventorySales)
      .where(eq(inventorySales.itemId, id));

    if (Number(salesCount?.count || 0) > 0) {
      throw new Error(
        'This item cannot be deleted because it is already used in existing inventory sales transactions.'
      );
    }

    // 3. Check if item has supplier purchases or consumed stock batches
    const purchases = await db
      .select()
      .from(inventoryPurchases)
      .where(eq(inventoryPurchases.itemId, id));

    const hasNonInitialPurchases = purchases.some(
      (p) => p.notes !== 'Initial opening stock batch' || p.remainingQuantity < p.quantity
    );

    if (hasNonInitialPurchases || purchases.length > 1) {
      throw new Error(
        'This item cannot be deleted because it is already used in existing inventory purchase transactions.'
      );
    }

    // 4. Safe deletion inside transaction: clean up opening stock purchase and delete master item
    return await db.transaction(async (tx) => {
      await tx.delete(inventoryPurchases).where(eq(inventoryPurchases.itemId, id));
      const [deleted] = await tx.delete(inventoryItems).where(eq(inventoryItems.id, id)).returning();
      return deleted;
    });
  }

  // =========================================================================
  // PURCHASES (INWARD STOCK)
  // =========================================================================

  async createPurchase(input: CreateInventoryPurchaseInput) {
    const qty = Number(input.quantity);
    const unitCost = Number(input.purchasePricePerUnit);
    const totalAmount = this.round(qty * unitCost);

    // Generate unique sequence number
    const year = new Date().getFullYear();
    const [lastPurchase] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryPurchases);
    let purSeq = Number(lastPurchase?.count || 0) + 1;
    let purchaseNumber = `PUR-${year}-${purSeq.toString().padStart(4, '0')}`;
    let existsPur = await db
      .select({ id: inventoryPurchases.id })
      .from(inventoryPurchases)
      .where(eq(inventoryPurchases.purchaseNumber, purchaseNumber));
    while (existsPur.length > 0) {
      purSeq++;
      purchaseNumber = `PUR-${year}-${purSeq.toString().padStart(4, '0')}`;
      existsPur = await db
        .select({ id: inventoryPurchases.id })
        .from(inventoryPurchases)
        .where(eq(inventoryPurchases.purchaseNumber, purchaseNumber));
    }

    const purchaseDate = new Date(input.purchaseDate);

    // Execute in transaction: insert purchase record + update item stock & current purchasePrice
    return await db.transaction(async (tx) => {
      const [purchase] = await tx
        .insert(inventoryPurchases)
        .values({
          purchaseNumber,
          itemId: input.itemId,
          supplierName: input.supplierName?.trim() || null,
          purchaseDate,
          quantity: qty,
          remainingQuantity: qty,
          purchasePricePerUnit: unitCost.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          notes: input.notes?.trim() || null,
        })
        .returning();

      // Update current stock and baseline purchase price on the item
      await tx
        .update(inventoryItems)
        .set({
          currentStock: sql`${inventoryItems.currentStock} + ${qty}`,
          purchasePrice: unitCost.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, input.itemId));

      return purchase;
    });
  }

  async getPurchases(filters: InventoryPurchaseQueryFilter) {
    const conditions: any[] = [];

    if (filters.itemId) {
      conditions.push(eq(inventoryPurchases.itemId, filters.itemId));
    }

    if (filters.dateFrom) {
      conditions.push(gte(inventoryPurchases.purchaseDate, new Date(filters.dateFrom)));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(inventoryPurchases.purchaseDate, toDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryPurchases)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const rows = await db
      .select({
        id: inventoryPurchases.id,
        purchaseNumber: inventoryPurchases.purchaseNumber,
        itemId: inventoryPurchases.itemId,
        itemName: inventoryItems.name,
        category: inventoryItems.category,
        brand: inventoryItems.brand,
        partNumber: inventoryItems.partNumber,
        supplierName: inventoryPurchases.supplierName,
        purchaseDate: inventoryPurchases.purchaseDate,
        quantity: inventoryPurchases.quantity,
        remainingQuantity: inventoryPurchases.remainingQuantity,
        purchasePricePerUnit: inventoryPurchases.purchasePricePerUnit,
        totalAmount: inventoryPurchases.totalAmount,
        notes: inventoryPurchases.notes,
        createdAt: inventoryPurchases.createdAt,
      })
      .from(inventoryPurchases)
      .innerJoin(inventoryItems, eq(inventoryPurchases.itemId, inventoryItems.id))
      .where(whereClause)
      .orderBy(desc(inventoryPurchases.purchaseDate), desc(inventoryPurchases.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // =========================================================================
  // SALES (OUTWARD STOCK WITH STRICT FIFO COST ALLOCATION)
  // =========================================================================

  async createSale(input: CreateInventorySaleInput) {
    const qty = Number(input.quantity);
    const sellingPrice = Number(input.sellingPricePerUnit);

    return await db.transaction(async (tx) => {
      // 1. Fetch item and lock row
      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, input.itemId));

      if (!item) {
        throw new Error('Inventory item not found');
      }

      if (item.currentStock < qty) {
        throw new Error(
          `Insufficient stock. Available stock is ${item.currentStock}, but requested ${qty}.`
        );
      }

      // 2. FIFO Allocation: Fetch available purchase batches ordered by purchaseDate ASC, createdAt ASC
      const availableBatches = await tx
        .select()
        .from(inventoryPurchases)
        .where(
          and(
            eq(inventoryPurchases.itemId, input.itemId),
            sql`${inventoryPurchases.remainingQuantity} > 0`
          )
        )
        .orderBy(asc(inventoryPurchases.purchaseDate), asc(inventoryPurchases.createdAt));

      let needed = qty;
      let totalCostAccumulated = 0;

      for (const batch of availableBatches) {
        const take = Math.min(batch.remainingQuantity, needed);
        const batchUnitCost = Number(batch.purchasePricePerUnit);
        totalCostAccumulated += take * batchUnitCost;
        needed -= take;

        const newRemaining = batch.remainingQuantity - take;
        await tx
          .update(inventoryPurchases)
          .set({
            remainingQuantity: newRemaining,
            updatedAt: new Date(),
          })
          .where(eq(inventoryPurchases.id, batch.id));

        if (needed === 0) break;
      }

      // If any units were not covered by recorded batches (e.g. unbatched legacy initial stock),
      // fall back to the item's baseline purchasePrice
      if (needed > 0) {
        const fallbackCost = Number(item.purchasePrice);
        totalCostAccumulated += needed * fallbackCost;
        needed = 0;
      }

      const totalCostAmount = this.round(totalCostAccumulated);
      const purchaseCostPerUnit = this.round(totalCostAmount / qty);
      const totalSaleAmount = this.round(qty * sellingPrice);
      const profit = this.round(totalSaleAmount - totalCostAmount);

      // Generate Sale Number
      const year = new Date().getFullYear();
      const [lastSale] = await tx.select({ count: sql<number>`count(*)` }).from(inventorySales);
      let saleSeq = Number(lastSale?.count || 0) + 1;
      let saleNumber = `INV-SALE-${year}-${saleSeq.toString().padStart(4, '0')}`;
      let existsSale = await tx
        .select({ id: inventorySales.id })
        .from(inventorySales)
        .where(eq(inventorySales.saleNumber, saleNumber));
      while (existsSale.length > 0) {
        saleSeq++;
        saleNumber = `INV-SALE-${year}-${saleSeq.toString().padStart(4, '0')}`;
        existsSale = await tx
          .select({ id: inventorySales.id })
          .from(inventorySales)
          .where(eq(inventorySales.saleNumber, saleNumber));
      }

      const saleDate = new Date(input.saleDate);

      // 3. Insert Sale Record (with permanently locked purchase cost snapshot)
      const [sale] = await tx
        .insert(inventorySales)
        .values({
          saleNumber,
          itemId: input.itemId,
          customerId: input.customerId || null,
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone?.trim() || null,
          saleDate,
          quantity: qty,
          sellingPricePerUnit: sellingPrice.toFixed(2),
          purchaseCostPerUnit: purchaseCostPerUnit.toFixed(2),
          totalSaleAmount: totalSaleAmount.toFixed(2),
          totalCostAmount: totalCostAmount.toFixed(2),
          profit: profit.toFixed(2),
          paymentStatus: input.paymentStatus || 'COMPLETED',
          notes: input.notes?.trim() || null,
        })
        .returning();

      // 4. Decrement current stock on item
      await tx
        .update(inventoryItems)
        .set({
          currentStock: sql`${inventoryItems.currentStock} - ${qty}`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, input.itemId));

      return sale;
    });
  }

  async getSales(filters: InventorySaleQueryFilter) {
    const conditions: any[] = [];

    if (filters.itemId) {
      conditions.push(eq(inventorySales.itemId, filters.itemId));
    }

    if (filters.customerId) {
      conditions.push(eq(inventorySales.customerId, filters.customerId));
    }

    if (filters.dateFrom) {
      conditions.push(gte(inventorySales.saleDate, new Date(filters.dateFrom)));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(inventorySales.saleDate, toDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventorySales)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const rows = await db
      .select({
        id: inventorySales.id,
        saleNumber: inventorySales.saleNumber,
        itemId: inventorySales.itemId,
        itemName: inventoryItems.name,
        category: inventoryItems.category,
        brand: inventoryItems.brand,
        partNumber: inventoryItems.partNumber,
        customerId: inventorySales.customerId,
        customerName: inventorySales.customerName,
        customerPhone: inventorySales.customerPhone,
        saleDate: inventorySales.saleDate,
        quantity: inventorySales.quantity,
        sellingPricePerUnit: inventorySales.sellingPricePerUnit,
        purchaseCostPerUnit: inventorySales.purchaseCostPerUnit,
        totalSaleAmount: inventorySales.totalSaleAmount,
        totalCostAmount: inventorySales.totalCostAmount,
        profit: inventorySales.profit,
        paymentStatus: inventorySales.paymentStatus,
        notes: inventorySales.notes,
        createdAt: inventorySales.createdAt,
      })
      .from(inventorySales)
      .innerJoin(inventoryItems, eq(inventorySales.itemId, inventoryItems.id))
      .where(whereClause)
      .orderBy(desc(inventorySales.saleDate), desc(inventorySales.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // =========================================================================
  // ANALYTICS & PROFIT METRICS
  // =========================================================================

  private resolveDateRange(filter: InventoryAnalyticsFilter): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    let start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (filter.period) {
      case 'today':
        break;
      case 'week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        start.setDate(diff);
        break;
      }
      case 'month':
        start.setDate(1);
        break;
      case 'year':
        start.setMonth(0, 1);
        break;
      case 'custom':
        if (filter.startDate) start = new Date(filter.startDate);
        if (filter.endDate) {
          const customEnd = new Date(filter.endDate);
          customEnd.setHours(23, 59, 59, 999);
          return { start, end: customEnd };
        }
        break;
    }

    return { start, end };
  }

  async getAnalytics(filter: InventoryAnalyticsFilter) {
    const { start, end } = this.resolveDateRange(filter);

    // Sales metrics in period
    const [salesSummary] = await db
      .select({
        totalSales: sql<string>`COALESCE(SUM(${inventorySales.totalSaleAmount}), '0')`,
        totalCost: sql<string>`COALESCE(SUM(${inventorySales.totalCostAmount}), '0')`,
        netProfit: sql<string>`COALESCE(SUM(${inventorySales.profit}), '0')`,
        qtySold: sql<string>`COALESCE(SUM(${inventorySales.quantity}), '0')`,
        salesCount: sql<number>`count(*)`,
      })
      .from(inventorySales)
      .where(and(gte(inventorySales.saleDate, start), lte(inventorySales.saleDate, end)));

    // Purchases metrics in period
    const [purchasesSummary] = await db
      .select({
        totalPurchases: sql<string>`COALESCE(SUM(${inventoryPurchases.totalAmount}), '0')`,
        qtyPurchased: sql<string>`COALESCE(SUM(${inventoryPurchases.quantity}), '0')`,
        purchasesCount: sql<number>`count(*)`,
      })
      .from(inventoryPurchases)
      .where(
        and(gte(inventoryPurchases.purchaseDate, start), lte(inventoryPurchases.purchaseDate, end))
      );

    // Total active inventory metrics (all time current state)
    const [inventoryStock] = await db
      .select({
        totalItems: sql<number>`count(*)`,
        totalStockQty: sql<string>`COALESCE(SUM(${inventoryItems.currentStock}), '0')`,
        stockValuation: sql<string>`COALESCE(SUM(${inventoryItems.currentStock} * ${inventoryItems.purchasePrice}), '0')`,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.status, 'ACTIVE'));

    // Low stock items count
    const [lowStockCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.status, 'ACTIVE'),
          sql`${inventoryItems.currentStock} <= ${inventoryItems.minStockLevel}`
        )
      );

    // Top 5 selling items in period
    const topSellingItems = await db
      .select({
        itemId: inventorySales.itemId,
        name: inventoryItems.name,
        category: inventoryItems.category,
        totalQuantitySold: sql<number>`COALESCE(SUM(${inventorySales.quantity}), 0)`,
        totalRevenue: sql<string>`COALESCE(SUM(${inventorySales.totalSaleAmount}), '0')`,
        totalProfit: sql<string>`COALESCE(SUM(${inventorySales.profit}), '0')`,
      })
      .from(inventorySales)
      .innerJoin(inventoryItems, eq(inventorySales.itemId, inventoryItems.id))
      .where(and(gte(inventorySales.saleDate, start), lte(inventorySales.saleDate, end)))
      .groupBy(inventorySales.itemId, inventoryItems.name, inventoryItems.category)
      .orderBy(sql`SUM(${inventorySales.quantity}) DESC`)
      .limit(5);

    // Top 5 most profitable items in period
    const topProfitableItems = await db
      .select({
        itemId: inventorySales.itemId,
        name: inventoryItems.name,
        category: inventoryItems.category,
        totalQuantitySold: sql<number>`COALESCE(SUM(${inventorySales.quantity}), 0)`,
        totalProfit: sql<string>`COALESCE(SUM(${inventorySales.profit}), '0')`,
        marginPercent: sql<number>`CASE WHEN SUM(${inventorySales.totalSaleAmount}) > 0 THEN ROUND((SUM(${inventorySales.profit}) / SUM(${inventorySales.totalSaleAmount}) * 100)::numeric, 1) ELSE 0 END`,
      })
      .from(inventorySales)
      .innerJoin(inventoryItems, eq(inventorySales.itemId, inventoryItems.id))
      .where(and(gte(inventorySales.saleDate, start), lte(inventorySales.saleDate, end)))
      .groupBy(inventorySales.itemId, inventoryItems.name, inventoryItems.category)
      .orderBy(sql`SUM(${inventorySales.profit}) DESC`)
      .limit(5);

    // Low stock items list (up to 10 for alerts)
    const lowStockAlerts = await db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        category: inventoryItems.category,
        brand: inventoryItems.brand,
        currentStock: inventoryItems.currentStock,
        minStockLevel: inventoryItems.minStockLevel,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.status, 'ACTIVE'),
          sql`${inventoryItems.currentStock} <= ${inventoryItems.minStockLevel}`
        )
      )
      .orderBy(asc(inventoryItems.currentStock))
      .limit(10);

    // Daily breakdown series for trend chart in period
    const dailySeries = await db
      .select({
        date: sql<string>`DATE(${inventorySales.saleDate})`,
        sales: sql<string>`COALESCE(SUM(${inventorySales.totalSaleAmount}), '0')`,
        costs: sql<string>`COALESCE(SUM(${inventorySales.totalCostAmount}), '0')`,
        profit: sql<string>`COALESCE(SUM(${inventorySales.profit}), '0')`,
      })
      .from(inventorySales)
      .where(and(gte(inventorySales.saleDate, start), lte(inventorySales.saleDate, end)))
      .groupBy(sql`DATE(${inventorySales.saleDate})`)
      .orderBy(sql`DATE(${inventorySales.saleDate}) ASC`);

    const totalSalesNum = Number(salesSummary?.totalSales || 0);
    const totalCostNum = Number(salesSummary?.totalCost || 0);
    const netProfitNum = Number(salesSummary?.netProfit || 0);
    const grossMarginPercent = totalSalesNum > 0 ? this.round((netProfitNum / totalSalesNum) * 100) : 0;

    return {
      period: filter.period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      kpis: {
        totalSales: totalSalesNum,
        totalPurchases: Number(purchasesSummary?.totalPurchases || 0),
        totalCostOfGoodsSold: totalCostNum,
        netProfit: netProfitNum,
        grossMarginPercent,
        totalQtySold: Number(salesSummary?.qtySold || 0),
        totalQtyPurchased: Number(purchasesSummary?.qtyPurchased || 0),
        salesTransactionCount: Number(salesSummary?.salesCount || 0),
        purchaseTransactionCount: Number(purchasesSummary?.purchasesCount || 0),
        totalActiveItems: Number(inventoryStock?.totalItems || 0),
        totalStockQuantity: Number(inventoryStock?.totalStockQty || 0),
        currentStockValuation: Number(inventoryStock?.stockValuation || 0),
        lowStockItemsCount: Number(lowStockCount?.count || 0),
      },
      topSellingItems,
      topProfitableItems,
      lowStockAlerts,
      dailySeries: dailySeries.map((d) => ({
        date: d.date,
        sales: Number(d.sales),
        costs: Number(d.costs),
        profit: Number(d.profit),
      })),
    };
  }

  // =========================================================================
  // PROFIT LEDGER (TRANSACTION-LEVEL PROFIT BREAKDOWN)
  // =========================================================================

  async getProfitLedger(filters: InventoryProfitLedgerFilter) {
    const conditions: any[] = [];

    if (filters.itemId) {
      conditions.push(eq(inventorySales.itemId, filters.itemId));
    }

    if (filters.period) {
      const { start, end } = this.resolveDateRange({
        period: filters.period,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      conditions.push(gte(inventorySales.saleDate, start));
      conditions.push(lte(inventorySales.saleDate, end));
    } else {
      if (filters.startDate) {
        conditions.push(gte(inventorySales.saleDate, new Date(filters.startDate)));
      }
      if (filters.endDate) {
        const toDate = new Date(filters.endDate);
        toDate.setHours(23, 59, 59, 999);
        conditions.push(lte(inventorySales.saleDate, toDate));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventorySales)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const rows = await db
      .select({
        id: inventorySales.id,
        saleNumber: inventorySales.saleNumber,
        saleDate: inventorySales.saleDate,
        itemId: inventorySales.itemId,
        itemName: inventoryItems.name,
        category: inventoryItems.category,
        brand: inventoryItems.brand,
        partNumber: inventoryItems.partNumber,
        customerName: inventorySales.customerName,
        quantity: inventorySales.quantity,
        purchaseCostPerUnit: inventorySales.purchaseCostPerUnit,
        sellingPricePerUnit: inventorySales.sellingPricePerUnit,
        totalCostAmount: inventorySales.totalCostAmount,
        totalSaleAmount: inventorySales.totalSaleAmount,
        profit: inventorySales.profit,
      })
      .from(inventorySales)
      .innerJoin(inventoryItems, eq(inventorySales.itemId, inventoryItems.id))
      .where(whereClause)
      .orderBy(desc(inventorySales.saleDate), desc(inventorySales.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedRows = rows.map((r) => {
      const saleAmt = Number(r.totalSaleAmount);
      const profitAmt = Number(r.profit);
      const marginPercent = saleAmt > 0 ? this.round((profitAmt / saleAmt) * 100) : 0;
      return {
        ...r,
        purchaseCostPerUnit: Number(r.purchaseCostPerUnit),
        sellingPricePerUnit: Number(r.sellingPricePerUnit),
        totalCostAmount: Number(r.totalCostAmount),
        totalSaleAmount: saleAmt,
        profit: profitAmt,
        marginPercent,
      };
    });

    return {
      data: formattedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const inventoryManagementRepository = new InventoryManagementRepository();
