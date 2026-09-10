import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { backupRestoreService } from './backup.service';

vi.mock('../../middleware/auth', () => ({
  authenticate: async (request: any) => {
    request.user = {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      role: 'Super Admin',
    };
  },
}));

vi.mock('../../middleware/rbac', () => ({
  requirePermission: () => async () => {},
  requireRole: (..._roles: any[]) => async () => {},
  getRolePermissionKeys: async () => new Set(['system.backup', 'system.restore', 'data.export.all']),
  invalidateRolePermissionCache: () => {},
}));

vi.mock('../../database/client', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'mock-new-id' }]),
      }),
    }),
    execute: vi.fn().mockResolvedValue([{ id: '1', name: 'row' }]),
    transaction: vi.fn().mockImplementation(async (cb) => {
      const tx = {
        query: {
          customers: { findFirst: vi.fn().mockResolvedValue(null) },
          products: { findFirst: vi.fn().mockResolvedValue({ id: 'p1', sku: 'RO-KENT-GP' }) },
          customerAssets: { findFirst: vi.fn().mockResolvedValue(null) },
          inventoryBalances: { findFirst: vi.fn().mockResolvedValue(null) },
          warranties: { findFirst: vi.fn().mockResolvedValue(null) },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'tx-new-id' }]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'tx-updated-id' }]),
          }),
        }),
        execute: vi.fn().mockResolvedValue([]),
      };
      return await cb(tx);
    }),
    query: {
      customers: { findMany: vi.fn().mockResolvedValue([{ customerNumber: 'CUST-001', fullName: 'John Doe', phone: '9876543210', customerType: 'INDIVIDUAL', status: 'ACTIVE', createdAt: new Date() }]) },
      products: { findMany: vi.fn().mockResolvedValue([]) },
      inventoryBalances: { findMany: vi.fn().mockResolvedValue([]) },
      sales: { findMany: vi.fn().mockResolvedValue([]) },
      invoices: { findMany: vi.fn().mockResolvedValue([]) },
      payments: { findMany: vi.fn().mockResolvedValue([]) },
      services: { findMany: vi.fn().mockResolvedValue([]) },
      jobCards: { findMany: vi.fn().mockResolvedValue([]) },
      warranties: { findMany: vi.fn().mockResolvedValue([]) },
      technicians: { findMany: vi.fn().mockResolvedValue([]) },
      inquiries: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
  sql: {
    raw: (s: string) => s,
  },
}));

describe('Phase 26 — Data Movement API Integration Routes (/api/v1/data-movement)', () => {
  let app: FastifyInstance;
  let tempTestDir: string;

  beforeAll(async () => {
    tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srm-routes-backup-'));
    backupRestoreService.setBackupDir(tempTestDir);
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    try {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    } catch {}
  });

  it('POST /api/v1/data-movement/import/preview should return validation preview', async () => {
    const csvContent = 'fullName,phone,city\nRajesh Sharma,9876543210,Pune\nAnita Rao,9123456789,Mumbai';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/data-movement/import/preview',
      payload: {
        type: 'customer',
        data: csvContent,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.totalRows).toBe(2);
    expect(body.data.validRows).toBe(2);
    expect(body.data.canProceed).toBe(true);
  });

  it('POST /api/v1/data-movement/import/execute should execute transactional import', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/data-movement/import/execute',
      payload: {
        type: 'customer',
        records: [{ fullName: 'Rajesh Sharma', phone: '9876543210', city: 'Pune' }],
        duplicatePolicy: 'CREATE',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.imported).toBe(1);
  });

  it('GET /api/v1/data-movement/import/template/:type should return downloadable CSV template', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/data-movement/import/template/customer',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.body).toContain('customerNumber,fullName,phone');
  });

  it('GET /api/v1/data-movement/export/:entity should export sanitized CSV dataset', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/data-movement/export/customers?format=csv',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.body).toContain('Customer Number,Full Name,Phone');
  });

  it('POST /api/v1/data-movement/backup should create a system snapshot', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/data-movement/backup',
      payload: { notes: 'Automated Test Backup' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.id.startsWith('BACKUP-')).toBe(true);
    expect(body.data.checksumSha256).toBeDefined();
  });

  it('GET /api/v1/data-movement/backups should list all backups', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/data-movement/backups',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.totalBackups).toBeGreaterThanOrEqual(1);
  });
});
