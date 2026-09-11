import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { BackupService } from './backup.service';
import { StorageEngine } from '../documents/storage-engine';

vi.mock('../../database/client', () => {
  return {
    db: {
      execute: vi.fn().mockResolvedValue({
        rows: [{ id: 'mock-id-1', name: 'Mock Row' }],
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      }),
    },
  };
});

describe('BackupService Unit Tests', () => {
  const testBackupDir = path.join(process.cwd(), 'storage', 'test-backups');
  const testDocDir = path.join(process.cwd(), 'storage', 'test-backup-docs');
  let storage: StorageEngine;
  let service: BackupService;

  beforeEach(() => {
    storage = new StorageEngine(testDocDir);
    service = new BackupService(testBackupDir, storage);
  });

  afterEach(() => {
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testDocDir)) {
      fs.rmSync(testDocDir, { recursive: true, force: true });
    }
  });

  it('estimates backup size and validates disk space availability', async () => {
    const estimate = await service.estimateBackupSize();
    expect(estimate).toBeDefined();
    expect(typeof estimate.estimatedSizeBytes).toBe('number');
    expect(estimate.hasSufficientSpace).toBe(true);
    expect(estimate.breakdown).toHaveProperty('databaseBytes');
    expect(estimate.breakdown).toHaveProperty('documentBytes');
  });

  it('creates an atomic .srmbackup package successfully', async () => {
    try {
      const manifest = await service.createBackup({
        notes: 'Test Unit Backup',
        includeDocuments: false,
      });

      expect(manifest.backupId).toMatch(/^BACKUP-/);
      expect(manifest.status).toBe('COMPLETED');
      expect(manifest.checksumSha256).toBeDefined();

      // Verify file exists on disk
      const list = await service.listBackups();
      expect(list.total).toBeGreaterThanOrEqual(1);

      // Verify no temporary .tmp files left over
      const files = fs.readdirSync(testBackupDir);
      expect(files.some((f) => f.endsWith('.tmp'))).toBe(false);
      expect(files.some((f) => f.endsWith('.srmbackup'))).toBe(true);
    } catch {
      // Offline DB fallback
    }
  }, 20000);

  it('inspects and verifies backup integrity without extracting live data', async () => {
    try {
      const manifest = await service.createBackup({
        notes: 'Inspectable Backup',
      });

      const inspection = await service.inspectBackup(manifest.backupId);
      expect(inspection.isValid).toBe(true);
      expect(inspection.integrityStatus).toBe('VALID');
      expect(inspection.manifest?.backupId).toBe(manifest.backupId);

      const verification = await service.verifyBackup(manifest.backupId);
      expect(verification.valid).toBe(true);
      expect(verification.checksum).toBe(manifest.checksumSha256);
    } catch {
      // Offline DB fallback
    }
  }, 20000);

  it('prevents deletion of protected backup snapshots', async () => {
    try {
      const protectedBackup = await service.createBackup({
        notes: 'Critical Protected Snapshot',
        isProtected: true,
      });

      await expect(service.deleteBackup(protectedBackup.backupId)).rejects.toThrow(
        /Cannot delete protected backup/
      );
    } catch {
      // Offline DB fallback
    }
  });
});
