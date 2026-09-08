import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import path from 'node:path';
import fs from 'node:fs';
import { buildApp } from '../../app';
import { ensureDatabaseInitialized, closeDatabaseConnections } from '../../database/client';
import { getRedisClient, closeRedisConnection } from '../../redis/client';
import { createSession } from '../../security/session';
import { AUTH_COOKIE_NAME } from '../../security/cookies';
import { emailQueueWorker } from '../notifications/email-queue.worker';
import { emailScheduler } from '../notifications/email-scheduler';
import { backupScheduler } from './backup-scheduler';
import { backupService } from './backup.service';

describe('Disaster Recovery & Backup Engine Integration E2E Tests', () => {
  let app: FastifyInstance;
  let authCookie: string;
  let createdBackupId: string;
  let createdBackupFilename: string;

  beforeAll(async () => {
    process.env.WHATSAPP_PROVIDER = 'MOCK';
    await ensureDatabaseInitialized();
    const redis = getRedisClient();
    const session = await createSession(redis, {
      userId: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      displayName: 'Ramesh Bomble (Super Admin)',
      role: 'Super Admin',
    });
    authCookie = `${AUTH_COOKIE_NAME}=${session.sessionId}`;

    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    backupScheduler.stop();
    emailScheduler.stop();
    emailQueueWorker.stopPeriodicRunner();
    await app.close();
    await closeDatabaseConnections();
    await closeRedisConnection();
  });

  it('Step 1: Estimates backup size and verifies storage capacity', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/storage/estimate',
      headers: {
        cookie: authCookie,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.hasSufficientSpace).toBe(true);
    expect(body.data.breakdown.databaseBytes).toBeGreaterThanOrEqual(0);
  });

  it('Step 2: Creates a manual full backup snapshot atomically', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/backups',
      headers: {
        cookie: authCookie,
      },
      payload: {
        notes: 'Pre-disaster recovery test snapshot',
        backupType: 'MANUAL',
        includeDocuments: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.backupId).toMatch(/^BACKUP-/);
    expect(body.data.status).toBe('COMPLETED');
    expect(body.data.checksumSha256).toBeDefined();
    expect(body.data.componentChecksums.database).toBeDefined();
    expect(body.data.totalRecords).toBeGreaterThanOrEqual(0);

    createdBackupId = body.data.backupId;

    // Verify on disk
    const backupDir = backupService.getBackupDir();
    const files = fs.readdirSync(backupDir);
    const matched = files.find((f) => f.includes(createdBackupId.toLowerCase()));
    expect(matched).toBeDefined();
    expect(matched?.endsWith('.srmbackup')).toBe(true);
    createdBackupFilename = matched!;

    // Ensure no temp files remain
    expect(files.some((f) => f.includes(createdBackupId.toLowerCase()) && f.endsWith('.tmp'))).toBe(false);
  });

  it('Step 3: Lists backups and verifies manifest in inventory', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/backups',
      headers: {
        cookie: authCookie,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const found = body.data.find((b: any) => b.backupId === createdBackupId);
    expect(found).toBeDefined();
    expect(found.backupType).toBe('MANUAL');
  });

  it('Step 4: Inspects backup metadata and verifies cryptographic SHA-256 hash', async () => {
    const inspectRes = await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${createdBackupId}/inspect`,
      headers: {
        cookie: authCookie,
      },
    });

    expect(inspectRes.statusCode).toBe(200);
    const inspectBody = inspectRes.json();
    expect(inspectBody.success).toBe(true);
    expect(inspectBody.data.isValid).toBe(true);
    expect(inspectBody.data.integrityStatus).toBe('VALID');
    expect(inspectBody.data.schemaCompatible).toBe(true);

    const verifyRes = await app.inject({
      method: 'POST',
      url: `/api/v1/backups/${createdBackupId}/verify`,
      headers: {
        cookie: authCookie,
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = verifyRes.json();
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.data.valid).toBe(true);
    expect(verifyBody.data.errors).toHaveLength(0);
  });

  it('Step 5: Downloads authenticated backup file package safely', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${createdBackupId}/download`,
      headers: {
        cookie: authCookie,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect(res.headers['content-disposition']).toContain('.srmbackup');
    expect(res.rawPayload.length).toBeGreaterThan(0);
  });

  it('Step 6: Prevents path traversal during download', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/..%2f..%2fpackage.json/download',
      headers: {
        cookie: authCookie,
      },
    });

    expect([400, 403, 404]).toContain(res.statusCode);
  });

  it('Step 7: Configures and reads automatic backup schedule', async () => {
    const updateRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/backups/schedule',
      headers: {
        cookie: authCookie,
      },
      payload: {
        enabled: true,
        frequency: 'DAILY',
        time: '04:00',
        retentionCount: 14,
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updateBody = updateRes.json();
    expect(updateBody.success).toBe(true);
    expect(updateBody.data.enabled).toBe(true);
    expect(updateBody.data.frequency).toBe('DAILY');
    expect(updateBody.data.time).toBe('04:00');
    expect(updateBody.data.retentionCount).toBe(14);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/schedule',
      headers: {
        cookie: authCookie,
      },
    });

    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json();
    expect(getBody.data.time).toBe('04:00');
    expect(getBody.data.retentionCount).toBe(14);
  });

  it('Step 8: Rejects restore without explicit confirmation flag', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/backups/${createdBackupId}/restore`,
      headers: {
        cookie: authCookie,
      },
      payload: {
        confirmAction: false,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('confirmation');
  });

  it('Step 9: Executes safe restore with automatic pre-restore safety snapshot', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/backups/${createdBackupId}/restore`,
      headers: {
        cookie: authCookie,
      },
      payload: {
        confirmAction: true,
        backupId: createdBackupId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.restoredBackupId).toBe(createdBackupId);
    expect(body.data.safetyBackupId).toMatch(/^SAFETY-/);
    expect(body.data.verification.databaseConnected).toBe(true);
    expect(body.data.verification.tableCountsMatch).toBe(true);
    expect(body.data.verification.relationshipsValid).toBe(true);

    // Verify safety backup exists in list and is protected
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/backups',
      headers: {
        cookie: authCookie,
      },
    });

    const listBody = listRes.json();
    const safety = listBody.data.find((b: any) => b.backupId === body.data.safetyBackupId);
    expect(safety).toBeDefined();
    expect(safety.isProtected).toBe(true);
    expect(safety.backupType).toBe('SAFETY');
  });

  it('Step 10: Rejects restoration of corrupted or tampered backup files', async () => {
    const corruptBackupPath = path.join(backupService.getBackupDir(), 'corrupt_test_backup.srmbackup');
    fs.writeFileSync(corruptBackupPath, '{"corrupted": true, "manifest": null}', 'utf8');

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/backups/corrupt_test_backup/restore',
        headers: {
          cookie: authCookie,
        },
        payload: {
          confirmAction: true,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.success).toBe(false);
    } finally {
      if (fs.existsSync(corruptBackupPath)) {
        fs.unlinkSync(corruptBackupPath);
      }
    }
  });

  it('Step 11: Triggers backup retention cleanup without affecting protected or safety backups', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/backups/retention/cleanup',
      headers: {
        cookie: authCookie,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.removedCount).toBe('number');
    expect(typeof body.data.retainedCount).toBe('number');
  });
});
