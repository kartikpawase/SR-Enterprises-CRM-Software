/**
 * reset-data.ts
 * Deletes all non-system customer data in correct FK-safe order.
 * Run with: tsx src/scripts/reset-data.ts
 */

import { PGlite } from '@electric-sql/pglite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storageDir = path.resolve(__dirname, '../../.crm-data/pgdata');

async function main() {
  console.log(`🔗 Connecting to database at: ${storageDir}`);
  const db = new PGlite(storageDir);
  await db.waitReady;
  console.log('✅ Connected.\n');

  // Deletion order respects FK constraints (children before parents)
  const tables = [
    // WhatsApp (leaf nodes)
    'whatsapp_messages',
    'whatsapp_events',
    'whatsapp_conversations',
    'whatsapp_contacts',

    // Email
    'email_queue',
    'email_notifications',

    // Inventory transactions
    'inventory_sales',
    'inventory_purchases',
    'inventory_items',

    // Rentals
    'rental_events',
    'rental_payments',
    'rentals',

    // Job cards & related
    'job_card_parts',
    'job_card_activities',
    'job_cards',

    // Sales & invoices
    'sale_items',
    'sales',
    'invoice_items',
    'payments',
    'invoices',

    // Other customer-linked
    'activities',
    'reminders',
    'notifications',
    'documents',
    'warranties',
    'audit_logs',
    'workflows',
    'inquiries',
    'assets',
    'services',

    // Customer assets (RESTRICT FK → must delete before customers)
    'customer_assets',
    'customer_addresses',

    // Customers last (parent of most above)
    'customers',
  ];

  let totalDeleted = 0;

  for (const table of tables) {
    try {
      const result = await db.query<{ count: string }>(
        `DELETE FROM "${table}" RETURNING 1`
      );
      const count = result.rows?.length ?? 0;
      if (count > 0) {
        console.log(`  🗑️  ${table}: deleted ${count} row(s)`);
      } else {
        console.log(`  ✅  ${table}: already empty`);
      }
      totalDeleted += count;
    } catch (err: any) {
      if (err?.message?.includes('does not exist')) {
        console.log(`  ⏭️  ${table}: table not found, skipping`);
      } else {
        console.warn(`  ⚠️  ${table}: ${err?.message}`);
      }
    }
  }

  await db.close();
  console.log(`\n✅ Reset complete. Total rows deleted: ${totalDeleted}`);
}

main().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
