import type { FastifyPluginAsync } from 'fastify';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { db } from '../../database/client';
import { sql } from 'drizzle-orm';
import { supabaseStorage } from '../documents/supabase-storage.service';
import { memorySales } from '../sales/sales.repository';
import { memoryInvoices, memoryInvoiceItems } from '../invoices/invoices.repository';
import { memoryPayments } from '../payments/payments.repository';
import { memoryServices } from '../services/services.repository';
import { memoryCustomers } from '../customers/customer.repository';

/**
 * System routes for testing end-to-end API connectivity and system maintenance
 */
export const systemRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/system/ping
   * Safe test endpoint verifying Frontend -> API -> Backend communication
   */
  fastify.get('/ping', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      data: {
        pong: true,
        timestamp: new Date().toISOString(),
        service: 'SR Enterprises CRM API',
        version: 'v1',
      },
    });
  });

  /**
   * POST /api/v1/system/purge-seeded-data
   * Administrative purge of all seeded/mock business records from CRM database.
   * Strictly resets sequences to 0 and preserves Super Admin accounts & system roles.
   */
  fastify.post(
    '/purge-seeded-data',
    { preHandler: [authenticate, requirePermission('settings.manage')] },
    async (_request, reply) => {
      const tablesToClean = [
        'rental_events',
        'rental_payments',
        'rentals',
        'inventory_sales',
        'inventory_purchases',
        'inventory_items',
        'reminders',
        'payments',
        'invoice_items',
        'invoices',
        'sale_items',
        'sales',
        'warranty_events',
        'warranties',
        'job_cards',
        'service_schedules',
        'services',
        'customer_assets',
        'customer_addresses',
        'customer_activities',
        'technicians',
        'inquiry_events',
        'inquiries',
        'whatsapp_events',
        'whatsapp_messages',
        'whatsapp_conversations',
        'whatsapp_contacts',
        'notifications',
        'email_notifications',
        'email_queue',
        'audit_logs',
        'documents',
        'customers',
        'products',
      ];

      const results: Record<string, string> = {};

      for (const table of tablesToClean) {
        try {
          await db.execute(sql.raw(`DELETE FROM "${table}"`));
          results[table] = 'purged';
        } catch (err: any) {
          results[table] = `error: ${err.message}`;
        }
      }

      // Reset all business sequence counters to 0 so fresh orders start at 0001
      try {
        await db.execute(sql.raw(`UPDATE "business_sequences" SET "current_val" = 0`));
        results['business_sequences'] = 'reset to 0';
      } catch (err: any) {
        results['business_sequences'] = `error: ${err.message}`;
      }

      return reply.status(200).send({
        success: true,
        message: 'All seeded and mock business data has been completely purged.',
        data: results,
      });
    }
  );

  /**
   * POST /api/v1/system/sync-schema
   * Ensure newly added tables like inquiry_events exist in PGlite
   */
  fastify.post(
    '/sync-schema',
    { preHandler: [authenticate, requirePermission('settings.manage')] },
    async (_request, reply) => {
      try {
        await db.execute(sql.raw(`
          CREATE TABLE IF NOT EXISTS "inquiry_events" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "inquiry_id" uuid NOT NULL REFERENCES "inquiries"("id") ON DELETE CASCADE,
            "event_type" text NOT NULL,
            "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
            "notes" text,
            "metadata" jsonb,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL
          );
        `));
        return reply.status(200).send({ success: true, message: 'Schema synchronized successfully' });
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message });
      }
    }
  );

  /**
   * POST /api/v1/system/delete-crm-database
   * Complete purge of all CRM data across database level and cloud/local storage levels.
   * Permanently clears all business tables, resets sequence counters to 0,
   * purges all objects from Supabase Storage bucket, and wipes local documents/backups.
   * Super Admin account and system roles are preserved for uninterrupted access.
   */
  fastify.post(
    '/delete-crm-database',
    { preHandler: [authenticate, requirePermission('settings.manage')] },
    async (_request, reply) => {
      const allBusinessTables = [
        'rental_events',
        'rental_payments',
        'rentals',
        'inventory_sales',
        'inventory_purchases',
        'inventory_items',
        'reminders',
        'payments',
        'invoice_items',
        'invoices',
        'sale_items',
        'sales',
        'warranty_events',
        'warranties',
        'job_cards',
        'service_schedules',
        'services',
        'customer_assets',
        'customer_addresses',
        'customer_custom_labels',
        'customer_activities',
        'technicians',
        'inquiry_events',
        'inquiries',
        'whatsapp_events',
        'whatsapp_messages',
        'whatsapp_conversations',
        'whatsapp_contacts',
        'notifications',
        'email_notifications',
        'email_queue',
        'audit_logs',
        'documents',
        'customers',
        'products',
        'app_settings',
      ];

      const dbResults: Record<string, string> = {};

      // 1. Delete all records from all business tables in DB
      for (const table of allBusinessTables) {
        try {
          await db.execute(sql.raw(`DELETE FROM "${table}"`));
          dbResults[table] = 'purged';
        } catch (err: any) {
          dbResults[table] = `skipped/error: ${err.message}`;
        }
      }

      // 2. Reset business sequences to 0
      try {
        await db.execute(sql.raw(`UPDATE "business_sequences" SET "current_val" = 0`));
        dbResults['business_sequences'] = 'reset to 0';
      } catch (err: any) {
        dbResults['business_sequences'] = `skipped/error: ${err.message}`;
      }

      // 3. Purge all files from Supabase Storage
      let storagePurgedCount = 0;
      try {
        const purgeRes = await supabaseStorage.purgeAllStorage();
        storagePurgedCount = purgeRes.deletedCount;
      } catch (err: any) {
        console.warn('[Delete CRM Database] Storage purge error:', err?.message || err);
      }

      // 4. Clean local storage directories if any exist
      try {
        const localDirs = ['./storage', './.crm-data/backups', './.crm-data/documents'];
        for (const dir of localDirs) {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              try {
                fs.unlinkSync(path.join(dir, file));
              } catch {}
            }
          }
        }
      } catch {}

      // 5. Reset memory store arrays
      try {
        memorySales.length = 0;
        memoryInvoices.length = 0;
        memoryInvoiceItems.length = 0;
        memoryPayments.length = 0;
        memoryServices.length = 0;
        memoryCustomers.length = 0;
      } catch {}

      return reply.status(200).send({
        success: true,
        message: 'CRM Database and Storage deleted successfully. All data wiped.',
        data: {
          tablesPurged: Object.keys(dbResults).length,
          storageFilesDeleted: storagePurgedCount,
          dbResults,
        },
      });
    }
  );
};


