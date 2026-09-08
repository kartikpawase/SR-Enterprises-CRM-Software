import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { customerTypeEnum, customerStatusEnum, customerLabelEnum, addressTypeEnum } from './enums';
import { users } from './users';

/**
 * Customers Table (Core Entity)
 */
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerNumber: text('customer_number').notNull().unique(), // e.g. CUST-2026-0001
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    customerType: customerTypeEnum('customer_type').default('INDIVIDUAL').notNull(),
    companyName: text('company_name'),
    gstNumber: text('gst_number'),
    status: customerStatusEnum('status').default('ACTIVE').notNull(),
    customerLabel: customerLabelEnum('customer_label'),
    customLabelId: uuid('custom_label_id').references(() => customerCustomLabels.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('customers_customer_number_idx').on(table.customerNumber),
    index('customers_phone_idx').on(table.phone),
    index('customers_email_idx').on(table.email),
    index('customers_status_idx').on(table.status),
    index('customers_customer_label_idx').on(table.customerLabel),
    index('customers_custom_label_id_idx').on(table.customLabelId),
    index('customers_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Customer Custom Labels Table (Admin-defined classification tags with custom names and colors)
 */
export const customerCustomLabels = pgTable(
  'customer_custom_labels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(), // e.g. "VIP Customer"
    color: text('color').notNull(), // e.g. "#3B82F6"
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('customer_custom_labels_name_idx').on(table.name),
  ]
);

/**
 * Customer Addresses Table (Normalized Billing and Service Addresses)
 */
export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    addressType: addressTypeEnum('address_type').default('SERVICE').notNull(),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    landmark: text('landmark'),
    city: text('city').default('').notNull(),
    state: text('state').default('').notNull(),
    postalCode: text('postal_code').default('').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('customer_addresses_customer_id_idx').on(table.customerId),
  ]
);
