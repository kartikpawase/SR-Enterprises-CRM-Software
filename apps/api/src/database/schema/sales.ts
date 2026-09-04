import { pgTable, uuid, text, numeric, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { saleStatusEnum } from './enums';
import { customers } from './customers';
import { products } from './products';
import { users } from './users';

/**
 * Sales Table
 */
export const sales = pgTable(
  'sales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    saleNumber: text('sale_number').notNull().unique(), // e.g. SALE-2026-0001
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    saleDate: timestamp('sale_date', { withTimezone: true, mode: 'date' }).notNull(),
    status: saleStatusEnum('status').default('COMPLETED').notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
    cancelReason: text('cancel_reason'),
  },
  (table) => [
    index('sales_sale_number_idx').on(table.saleNumber),
    index('sales_customer_id_idx').on(table.customerId),
    index('sales_date_idx').on(table.saleDate),
    index('sales_status_idx').on(table.status),
  ]
);

/**
 * Sale Items Table (Immutable Snapshots)
 */
export const saleItems = pgTable(
  'sale_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productNameSnapshot: text('product_name_snapshot').notNull(),
    skuSnapshot: text('sku_snapshot').notNull(),
    quantity: integer('quantity').default(1).notNull(),
    unitPriceSnapshot: numeric('unit_price_snapshot', { precision: 12, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    taxRatePercent: numeric('tax_rate_percent', { precision: 5, scale: 2 }).default('18.00').notNull(),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    warrantyMonths: integer('warranty_months').default(12).notNull(),
    serviceIntervalMonths: integer('service_interval_months').default(6).notNull(),
    serialNumber: text('serial_number'),
    nextServiceDate: timestamp('next_service_date', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('sale_items_sale_id_idx').on(table.saleId),
    index('sale_items_product_id_idx').on(table.productId),
  ]
);
