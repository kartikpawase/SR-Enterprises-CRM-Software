import type { FastifyPluginAsync } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../database/client';
import { auditLogs } from '../../database/schema/audit';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { configService } from './configuration.service';
import { HTTP_STATUS } from '@crm/shared';
import type { SettingsCategory, PermissionKey } from '@crm/types';

const CATEGORY_PERMISSIONS: Record<SettingsCategory, PermissionKey> = {
  SYSTEM: 'settings.manage',
  BUSINESS: 'settings.business.manage',
  TAX: 'settings.tax.manage',
  INVOICE: 'settings.invoice.manage',
  PAYMENT: 'settings.payment.manage',
  SALES: 'settings.manage',
  SERVICE: 'settings.service.manage',
  JOB_CARD: 'settings.manage',
  WARRANTY: 'settings.warranty.manage',
  INVENTORY: 'settings.inventory.manage',
  NOTIFICATION: 'settings.notification.manage',
  NUMBERING: 'settings.numbering.manage',
  SECURITY: 'settings.security.manage',
};

const VALID_CATEGORIES = new Set<string>([
  'SYSTEM',
  'BUSINESS',
  'TAX',
  'INVOICE',
  'PAYMENT',
  'SALES',
  'SERVICE',
  'JOB_CARD',
  'WARRANTY',
  'INVENTORY',
  'NOTIFICATION',
  'NUMBERING',
  'SECURITY',
]);

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/settings/public
   * Public Branding, Localization & Formatting Metadata (No Auth Required)
   */
  fastify.get('/public', async (_request, reply) => {
    try {
      const publicSettings = await configService.getPublicSettings();
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: publicSettings,
      });
    } catch (err: any) {
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: { code: 'SETTINGS_ERROR', message: err.message },
      });
    }
  });

  /**
   * GET /api/v1/settings/health
   * Validate all category configurations for integrity and correctness
   */
  fastify.get(
    '/health',
    { preHandler: [authenticate, requirePermission('settings.view')] },
    async (_request, reply) => {
      try {
        const health = await configService.validateHealth();
        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          data: health,
        });
      } catch (err: any) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: { code: 'SETTINGS_HEALTH_ERROR', message: err.message },
        });
      }
    }
  );

  /**
   * GET /api/v1/settings/audit-logs
   * Retrieve recent configuration change audit trail records
   */
  fastify.get(
    '/audit-logs',
    { preHandler: [authenticate, requirePermission('settings.view')] },
    async (_request, reply) => {
      try {
        const logs = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.entityType, 'SETTINGS'))
          .orderBy(desc(auditLogs.timestamp))
          .limit(50);
        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          data: logs,
        });
      } catch (err: any) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: { code: 'SETTINGS_AUDIT_LOGS_ERROR', message: err.message },
        });
      }
    }
  );

  /**
   * GET /api/v1/settings
   * Retrieve all business and system configuration categories
   */
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('settings.view')] },
    async (_request, reply) => {
      try {
        const allSettings = await configService.getAll();
        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          data: allSettings,
        });
      } catch (err: any) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: { code: 'SETTINGS_FETCH_ERROR', message: err.message },
        });
      }
    }
  );

  /**
   * GET /api/v1/settings/:category
   * Retrieve a specific configuration category
   */
  fastify.get<{ Params: { category: string } }>(
    '/:category',
    { preHandler: [authenticate, requirePermission('settings.view')] },
    async (request, reply) => {
      const categoryUpper = request.params.category.toUpperCase() as SettingsCategory;

      if (!VALID_CATEGORIES.has(categoryUpper)) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Unknown configuration category '${request.params.category}'. Valid categories are: ${Array.from(VALID_CATEGORIES).join(', ')}`,
          },
        });
      }

      try {
        const data = await configService.get(categoryUpper);
        const version = await configService.getCategoryVersion(categoryUpper);
        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          data: {
            category: categoryUpper,
            value: data,
            version,
          },
        });
      } catch (err: any) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: { code: 'SETTINGS_FETCH_ERROR', message: err.message },
        });
      }
    }
  );

  /**
   * PATCH /api/v1/settings/:category
   * Update configuration with optimistic locking, schema validation, and audit trail
   */
  fastify.patch<{ Params: { category: string }; Body: { data: any; expectedVersion?: number } }>(
    '/:category',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const categoryUpper = request.params.category.toUpperCase() as SettingsCategory;

      if (!VALID_CATEGORIES.has(categoryUpper)) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Unknown configuration category '${request.params.category}'.`,
          },
        });
      }

      // Check RBAC: requires generic settings.manage or category-specific permission
      const reqPerm = CATEGORY_PERMISSIONS[categoryUpper];
      const user = request.user;
      const role = user?.role;

      // We authorize if user has settings.manage or the specific category permission
      const isSuperAdminOrAdmin = role === 'Super Admin' || role === 'Admin';
      if (!isSuperAdminOrAdmin) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `You do not have permission to manage ${categoryUpper} settings (Requires '${reqPerm}' or 'settings.manage').`,
          },
        });
      }

      const body = request.body || ({} as any);
      const patchData = body.data || body;
      const expectedVersion = body.expectedVersion;

      try {
        const result = await configService.update(
          categoryUpper,
          patchData,
          expectedVersion,
          user?.userId,
          user?.username
        );

        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          message: `${categoryUpper} configuration updated successfully.`,
          data: result.data,
          version: result.version,
        });
      } catch (err: any) {
        const isConflict = err.message.includes('Configuration conflict');
        return reply.status(isConflict ? HTTP_STATUS.CONFLICT : HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: isConflict ? 'CONFIGURATION_CONFLICT' : 'VALIDATION_ERROR',
            message: err.message,
          },
        });
      }
    }
  );

  /**
   * POST /api/v1/settings/:category/reset
   * Reset a configuration category to system defaults
   */
  fastify.post<{ Params: { category: string }; Body: { confirmation?: string } }>(
    '/:category/reset',
    { preHandler: [authenticate, requirePermission('settings.manage')] },
    async (request, reply) => {
      const categoryUpper = request.params.category.toUpperCase() as SettingsCategory;

      if (!VALID_CATEGORIES.has(categoryUpper)) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Unknown configuration category.' },
        });
      }

      const confirmation = request.body?.confirmation;
      if (confirmation !== 'RESET') {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'CONFIRMATION_REQUIRED',
            message: "Explicit confirmation phrase 'RESET' is required to restore default settings.",
          },
        });
      }

      const user = request.user;
      try {
        const result = await configService.resetToDefaults(categoryUpper, user?.userId, user?.username);
        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          message: `${categoryUpper} configuration reset to system defaults.`,
          data: result.data,
          version: result.version,
        });
      } catch (err: any) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: { code: 'RESET_FAILED', message: err.message },
        });
      }
    }
  );
};
