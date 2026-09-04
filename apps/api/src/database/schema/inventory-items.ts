import { pgTable, uuid, text, numeric, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { customers } from './customers';

/**
 * Inventory Items Table (Spare parts, accessories & consumables master)
 */
export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    category: text('category').notNull(), // Filter, Membrane, Pump, SMPS, Fitting, Tubing, Accessories, Other
    brand: text('brand'),
    partNumber: text('part_number'), // SKU or manufacturer part code
    description: text('description'),
    purchasePrice: numeric('purchase_price', { precision: 12, scale: 2 }).notNull(), // Default / latest unit cost
    sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull(), // Default unit selling price
    currentStock: integer('current_stock').default(0).notNull(),
    minStockLevel: integer('min_stock_level').default(0).notNull(),
    status: text('status').default('ACTIVE').notNull(), // ACTIVE, INACTIVE, DISCONTINUED
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('inventory_items_name_idx').on(table.name),
    index('inventory_items_category_idx').on(table.category),
    index('inventory_items_part_number_idx').on(table.partNumber),
    index('inventory_items_status_idx').on(table.status),
  ]
);

/**
 * Inventory Purchases Table (Inward supplier stock purchases with unit cost)
 */
export const inventoryPurchases = pgTable(
  'inventory_purchases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    purchaseNumber: text('purchase_number').notNull().unique(), // e.g. PUR-2026-0001
    itemId: uuid('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    supplierName: text('supplier_name'),
    purchaseDate: timestamp('purchase_date', { withTimezone: true, mode: 'date' }).notNull(),
    quantity: integer('quantity').notNull(), // Initial purchased quantity
    remainingQuantity: integer('remaining_quantity').notNull(), // Available batch quantity for FIFO
    purchasePricePerUnit: numeric('purchase_price_per_unit', { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(), // quantity * purchasePricePerUnit
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('inventory_purchases_item_id_idx').on(table.itemId),
    index('inventory_purchases_date_idx').on(table.purchaseDate),
    index('inventory_purchases_rem_qty_idx').on(table.remainingQuantity),
  ]
);

/**
 * Inventory Sales Table (Outward sales with customer association, locked purchase cost, and calculated profit)
 */
export const inventorySales = pgTable(
  'inventory_sales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    saleNumber: text('sale_number').notNull().unique(), // e.g. INV-SALE-2026-0001
    itemId: uuid('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone'),
    saleDate: timestamp('sale_date', { withTimezone: true, mode: 'date' }).notNull(),
    quantity: integer('quantity').notNull(),
    sellingPricePerUnit: numeric('selling_price_per_unit', { precision: 12, scale: 2 }).notNull(),
    purchaseCostPerUnit: numeric('purchase_cost_per_unit', { precision: 12, scale: 2 }).notNull(), // Transaction-time locked FIFO purchase cost
    totalSaleAmount: numeric('total_sale_amount', { precision: 12, scale: 2 }).notNull(), // quantity * sellingPricePerUnit
    totalCostAmount: numeric('total_cost_amount', { precision: 12, scale: 2 }).notNull(), // quantity * purchaseCostPerUnit
    profit: numeric('profit', { precision: 12, scale: 2 }).notNull(), // totalSaleAmount - totalCostAmount
    paymentStatus: text('payment_status').default('COMPLETED').notNull(), // COMPLETED, PENDING
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('inventory_sales_item_id_idx').on(table.itemId),
    index('inventory_sales_customer_id_idx').on(table.customerId),
    index('inventory_sales_date_idx').on(table.saleDate),
  ]
);
