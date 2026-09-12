import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { settingsRoutes } from './settings.routes';
import { HTTP_STATUS } from '@crm/shared';

// Mock auth & rbac middleware
vi.mock('../../middleware/auth', () => ({
  authenticate: vi.fn(async (req, _reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      const err = new Error('Authentication required');
      (err as any).statusCode = 401;
      throw err;
    }
    const role = authHeader.includes('Technician') ? 'Technician' : 'Super Admin';
    req.user = {
      id: 'usr-admin-1',
      email: 'admin@srenterprises.com',
      role,
      name: 'System Admin',
    };
  }),
}));

vi.mock('../../middleware/rbac', () => ({
  requirePermission: vi.fn((...permissions: string[]) => async (req: any, reply: any) => {
    const userRole = req.user?.role;
    if (userRole === 'Technician' && !permissions.includes('technician.access')) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permission' },
      });
    }
  }),
  requireAnyPermission: vi.fn((...permissions: string[]) => async (req: any, reply: any) => {
    const userRole = req.user?.role;
    if (userRole === 'Technician' && !permissions.includes('technician.access')) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permission' },
      });
    }
  }),
  requireRole: vi.fn((...roles: string[]) => async (req: any, reply: any) => {
    const userRole = req.user?.role;
    if (!roles.includes(userRole)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permission' },
      });
    }
  }),
  authorize: vi.fn((allowedPermissions: string[]) => async (req: any, reply: any) => {
    const userRole = req.user?.role;
    if (userRole === 'Technician' && !allowedPermissions.includes('technician.access')) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permission' },
      });
    }
  }),
}));

// Mock DB
vi.mock('../../database/client', () => ({
  db: {
    query: {
      appSettings: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    })),
    transaction: vi.fn(async (cb) => {
      const mockTx = {
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            onConflictDoUpdate: vi.fn().mockResolvedValue([{}]),
          })),
        })),
      };
      return cb(mockTx);
    }),
  },
}));

describe('Phase 27: Settings & Business Configuration API Routes — Integration Tests', () => {
  let app: any;

  beforeEach(async () => {
    app = Fastify();
    await app.register(settingsRoutes);
    await app.ready();
    vi.clearAllMocks();
  });

  describe('1. Public Settings Endpoint', () => {
    it('GET /public should return public branding without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/public',
      });

      expect(response.statusCode).toBe(HTTP_STATUS.OK);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.appName).toContain('SR Enterprises');
      expect(json.data.currencySymbol).toBe('₹');
      expect(json.data.defaultTaxRatePercent).toBe(18);
    });
  });

  describe('2. Authenticated Admin Settings Endpoints', () => {
    it('GET / should return all configuration categories for Super Admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
        headers: { authorization: 'Bearer superadmin-token' },
      });

      expect(response.statusCode).toBe(HTTP_STATUS.OK);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('system');
      expect(json.data).toHaveProperty('business');
      expect(json.data).toHaveProperty('tax');
      expect(json.data).toHaveProperty('invoice');
      expect(json.data).toHaveProperty('payment');
      expect(json.data).toHaveProperty('warranty');
      expect(json.data).toHaveProperty('numbering');
    });

    it('GET /:category should return single category details with version', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/TAX',
        headers: { authorization: 'Bearer superadmin-token' },
      });

      expect(response.statusCode).toBe(HTTP_STATUS.OK);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.category).toBe('TAX');
      expect(json.data.value.defaultTaxRatePercent).toBe(18);
      expect(json.data.version).toBe(1);
    });

    it('GET /:category should reject invalid category names with 400', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/INVALID_CAT',
        headers: { authorization: 'Bearer superadmin-token' },
      });

      expect(response.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_CATEGORY');
    });
  });

  describe('3. Configuration Updates & Concurrency', () => {
    it('PATCH /:category should successfully update settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/TAX',
        headers: { authorization: 'Bearer superadmin-token' },
        payload: {
          defaultTaxRatePercent: 20.00,
        },
      });

      expect(response.statusCode).toBe(HTTP_STATUS.OK);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.defaultTaxRatePercent).toBe(20);
    });

    it('PATCH /:category should block unauthorized roles with 403 Forbidden', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/TAX',
        headers: { authorization: 'Bearer Technician-token' },
        payload: {
          defaultTaxRatePercent: 25.00,
        },
      });

      expect(response.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  describe('4. Settings Reset Safeguards', () => {
    it('POST /:category/reset should reject without explicit confirmation phrase', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/TAX/reset',
        headers: { authorization: 'Bearer superadmin-token' },
        payload: {},
      });

      expect(response.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('POST /:category/reset should succeed with confirmation: "RESET"', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/TAX/reset',
        headers: { authorization: 'Bearer superadmin-token' },
        payload: { confirmation: 'RESET' },
      });

      expect(response.statusCode).toBe(HTTP_STATUS.OK);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.defaultTaxRatePercent).toBe(18);
    });
  });

  describe('5. Health & Audit Endpoints', () => {
    it('GET /health should return 200 with configuration status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { authorization: 'Bearer superadmin-token' },
      });

      expect(response.statusCode).toBe(HTTP_STATUS.OK);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.healthy).toBe(true);
    });

    it('GET /audit-logs should return settings audit trail', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit-logs',
        headers: { authorization: 'Bearer superadmin-token' },
      });

      expect(response.statusCode).toBe(HTTP_STATUS.OK);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });
});
