import { pgTable, uuid, text, numeric, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { invoiceStatusEnum, invoiceItemTypeEnum } from './enums';
import { customers } from './customers';
import { sales } from './sales';
import { products } from './products';
import { users } from './users';

/**
 * Invoices Table
 */
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceNumber: text('invoice_number').notNull().unique(), // e.g. INV-2026-0001
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    saleId: uuid('sale_id')
      .references(() => sales.id, { onDelete: 'set null' }),
    jobCardId: uuid('job_card_id'),
    serviceId: uuid('service_id'),
    invoiceDate: timestamp('invoice_date', { withTimezone: true, mode: 'date' }).notNull(),
    dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }).notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: invoiceStatusEnum('status').default('ISSUED').notNull(),
    poNumber: text('po_number'),
    notes: text('notes'),
    termsAndConditions: text('terms_and_conditions'),
    pdfFileId: uuid('pdf_file_id'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
    cancelReason: text('cancel_reason'),
  },
  (table) => [
    index('invoices_invoice_number_idx').on(table.invoiceNumber),
    index('invoices_customer_id_idx').on(table.customerId),
    index('invoices_sale_id_idx').on(table.saleId),
    index('invoices_job_card_id_idx').on(table.jobCardId),
    index('invoices_service_id_idx').on(table.serviceId),
    index('invoices_due_date_idx').on(table.dueDate),
    index('invoices_status_idx').on(table.status),
    index('invoices_po_number_idx').on(table.poNumber),
  ]
);

/**
 * Invoice Items Table (Immutable Financial Line Items)
 */
export const invoiceItems = pgTable(
  'invoice_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'set null' }),
    itemType: invoiceItemTypeEnum('item_type').default('PRODUCT').notNull(),
    nameSnapshot: text('name_snapshot').notNull(),
    descriptionSnapshot: text('description_snapshot'),
    quantity: integer('quantity').default(1).notNull(),
    unitPriceSnapshot: numeric('unit_price_snapshot', { precision: 12, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    taxRatePercent: numeric('tax_rate_percent', { precision: 5, scale: 2 }).default('18.00').notNull(),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('invoice_items_invoice_id_idx').on(table.invoiceId),
  ]
);
