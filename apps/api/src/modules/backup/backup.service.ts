import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../database/client';
import { sql } from 'drizzle-orm';
import { auditLogs } from '../../database/schema/audit';
import { storageEngine, StorageEngine } from '../documents/storage-engine';
import {
  backupValidator,
  BackupValidator,
  CURRENT_BACKUP_FORMAT_VERSION,
  CURRENT_SRM_VERSION,
  CURRENT_SCHEMA_VERSION,
} from './backup-validator';
import type {
  BackupManifestDTO,
  CreateBackupRequest,
  BackupInspectionReport,
  BackupStorageEstimate,
  BackupType,
  UserSession,
} from '@crm/types';

export const ORDERED_DOMAIN_TABLES = [
  'roles',
  'permissions',
  'role_permissions',
  'users',
  'customers',
  'customer_addresses',
  'customer_custom_labels',
  'customer_activities',
  'technicians',
  'products',
  'inventory_items',
  'inventory_purchases',
  'inventory_sales',
  'inventory_balances',
  'inventory_transactions',
  'customer_assets',
  'sales',
  'sale_items',
  'invoices',
  'invoice_items',
  'payments',
  'rentals',
  'rental_payments',
  'rental_events',
  'services',
  'service_schedules',
  'job_cards',
  'warranties',
  'warranty_events',
  'reminders',
  'inquiries',
  'inquiry_events',
  'whatsapp_contacts',
  'whatsapp_conversations',
  'whatsapp_messages',
  'whatsapp_events',
  'email_notifications',
  'email_queue',
  'documents',
  'document_attachments',
  'outbox_events',
  'workflow_definitions',
  'workflow_executions',
  'workflow_action_executions',
  'business_sequences',
  'app_settings',
  'notifications',
  'notification_preferences',
  'audit_logs',
];

export class BackupService {
  private backupDir: string;
  private validator: BackupValidator;
  private storage: StorageEngine;
  private isBackingUp = false;

  constructor(customBackupDir?: string, customStorage?: StorageEngine) {
    this.backupDir = path.resolve(customBackupDir || process.env.BACKUP_STORAGE_DIR || './backups');
    this.validator = backupValidator;
    this.storage = customStorage || storageEngine;

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  public setBackupDir(customDir: string) {
    this.backupDir = path.resolve(customDir);
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  public getBackupDir(): string {
    return this.backupDir;
  }

  /**
   * Check if a backup operation is currently executing
   */
  public isOperationInProgress(): boolean {
    return this.isBackingUp;
  }

  /**
   * Pre-flight size estimation
   */
  public async estimateBackupSize(): Promise<BackupStorageEstimate> {
    let totalDbRecords = 0;
    for (const table of ORDERED_DOMAIN_TABLES) {
      try {
        const countRes: any = await db.execute(sql.raw(`SELECT count(*)::int as count FROM "${table}";`));
        const rows = Array.isArray(countRes) ? countRes : countRes?.rows || [];
        totalDbRecords += Number(rows[0]?.count || 0);
      } catch {
        // Table might not exist yet
      }
    }

    // Estimate ~1.2KB per DB record on average
    const databaseBytes = totalDbRecords * 1200;

    // Scan documents storage size
    const physicalDocs = await this.storage.scanPhysicalFiles();
    const documentBytes = physicalDocs.totalSizeBytes;

    const estimatedArchiveBytes = Math.ceil((databaseBytes + documentBytes) * 0.85); // Estimated compressed/bundled size

    return {
      estimatedSizeBytes: estimatedArchiveBytes,
      estimatedSizeFormatted: `${(estimatedArchiveBytes / (1024 * 1024)).toFixed(2)} MB`,
      hasSufficientSpace: true,
      breakdown: {
        databaseBytes,
        documentBytes,
        estimatedArchiveBytes,
      },
    };
  }

  /**
   * Create Full or Safety Backup Snapshot
   */
  public async createBackup(
    options: CreateBackupRequest & { isSafetyBackup?: boolean },
    user?: { userId?: string; role?: string }
  ): Promise<BackupManifestDTO> {
    if (this.isBackingUp) {
      throw new Error('Backup Error: Another backup operation is currently in progress.');
    }

    this.isBackingUp = true;
    const startTime = Date.now();

    try {
      const isSafety = !!options.isSafetyBackup;
      const backupType: BackupType = isSafety ? 'SAFETY' : options.backupType || 'FULL';
      const backupId = isSafety ? `SAFETY-${Date.now()}` : `BACKUP-${Date.now()}`;
      const timestamp = new Date().toISOString();
      const filename = `srm_${backupId.toLowerCase()}_${timestamp.replace(/[:.]/g, '-')}.srmbackup`;
      const tempFilePath = path.join(this.backupDir, `${filename}.tmp`);
      const finalFilePath = path.join(this.backupDir, filename);

      // 1. Capture Database Tables Snapshot
      const tableCounts: Record<string, number> = {};
      const tablesData: Record<string, any[]> = {};
      let totalRecords = 0;

      for (const table of ORDERED_DOMAIN_TABLES) {
        try {
          const res: any = await db.execute(sql.raw(`SELECT * FROM "${table}";`));
          const rows = Array.isArray(res) ? res : res?.rows || [];
          tablesData[table] = rows;
          tableCounts[table] = rows.length;
          totalRecords += rows.length;
        } catch {
          tablesData[table] = [];
          tableCounts[table] = 0;
        }
      }

      const databaseJson = JSON.stringify(tablesData);
      const dbHash = this.validator.calculateSha256(databaseJson);
      const databaseSizeBytes = Buffer.byteLength(databaseJson, 'utf8');

      // 2. Capture Document Files if requested
      const includeDocs = options.includeDocuments !== false;
      const documentsPayload: Record<string, { originalFilename: string; mimeType: string; dataBase64: string }> = {};
      let documentCount = 0;
      let documentStorageSizeBytes = 0;

      if (includeDocs) {
        const docsList = tablesData['documents'] || [];
        for (const doc of docsList) {
          if (doc.storage_path && this.storage.fileExists(doc.storage_path)) {
            try {
              const fileBuf = await this.storage.readFile(doc.storage_path);
              documentsPayload[doc.storage_path] = {
                originalFilename: doc.original_filename || 'document',
                mimeType: doc.mime_type || 'application/octet-stream',
                dataBase64: fileBuf.toString('base64'),
              };
              documentCount++;
              documentStorageSizeBytes += fileBuf.length;
            } catch {
              // Non-fatal if single physical file missing
            }
          }
        }

        // Also scan physical storage on disk to ensure any unindexed invoice/receipt PDFs are preserved
        try {
          const physicalDocs = await this.storage.scanPhysicalFiles();
          for (const relPath of physicalDocs.files) {
            if (!documentsPayload[relPath] && this.storage.fileExists(relPath)) {
              try {
                const fileBuf = await this.storage.readFile(relPath);
                documentsPayload[relPath] = {
                  originalFilename: path.basename(relPath),
                  mimeType: 'application/octet-stream',
                  dataBase64: fileBuf.toString('base64'),
                };
                documentCount++;
                documentStorageSizeBytes += fileBuf.length;
              } catch {
                // Non-fatal if single read fails
              }
            }
          }
        } catch {
          // Non-fatal if physical scan fails
        }
      }

      const documentsJson = JSON.stringify(documentsPayload);
      const docsHash = this.validator.calculateSha256(documentsJson);

      // 3. Assemble Manifest
      const manifest: BackupManifestDTO = {
        backupId,
        createdAt: timestamp,
        srmVersion: CURRENT_SRM_VERSION,
        databaseSchemaVersion: CURRENT_SCHEMA_VERSION,
        backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
        backupType,
        tableCounts,
        totalRecords,
        documentCount,
        documentStorageSizeBytes,
        databaseSizeBytes,
        totalPackageSizeBytes: 0,
        checksumSha256: '',
        componentChecksums: {
          database: dbHash,
          documents: docsHash,
        },
        status: 'COMPLETED',
        notes: options.notes || undefined,
        isProtected: !!options.isProtected,
      };

      // 4. Assemble Full Package Container
      const packageContainer = {
        manifest,
        databaseJson,
        documentsJson: includeDocs ? documentsJson : undefined,
      };

      const packageString = JSON.stringify(packageContainer);
      const packageHash = this.validator.calculateSha256(packageString);
      const totalBytes = Buffer.byteLength(packageString, 'utf8');

      manifest.checksumSha256 = packageHash;
      manifest.totalPackageSizeBytes = totalBytes;
      packageContainer.manifest = manifest;

      // 5. Atomic File Finalization
      await fs.promises.writeFile(tempFilePath, JSON.stringify(packageContainer), 'utf8');
      await fs.promises.rename(tempFilePath, finalFilePath);

      // 6. Record Audit Log
      try {
        if (user?.userId) {
          await db.insert(auditLogs).values({
            actorId: user.userId,
            action: 'CREATE',
            entityType: 'backup',
            entityId: backupId,
            afterState: {
              filename,
              backupType,
              totalRecords,
              documentCount,
              checksum: packageHash,
            },
          });
        }
      } catch {
        // Non-critical audit failure
      }

      return manifest;
    } finally {
      this.isBackingUp = false;
    }
  }

  /**
   * List all backups in storage directory
   */
  public async listBackups(options?: { page?: number; limit?: number; type?: string }): Promise<{
    items: (BackupManifestDTO & { filename: string })[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!fs.existsSync(this.backupDir)) {
      return { items: [], total: 0, page: 1, limit: 20 };
    }

    const files = await fs.promises.readdir(this.backupDir);
    const backupFiles = files.filter(
      (f) => (f.endsWith('.srmbackup') || f.endsWith('.srm.json')) && !f.endsWith('.tmp')
    );

    const items: (BackupManifestDTO & { filename: string })[] = [];

    for (const filename of backupFiles) {
      try {
        const fullPath = path.join(this.backupDir, filename);
        const content = await fs.promises.readFile(fullPath, 'utf8');
        const parsed = JSON.parse(content);
        const manifest: BackupManifestDTO = parsed.manifest || parsed;

        if (manifest?.backupId) {
          items.push({
            ...manifest,
            filename,
          });
        }
      } catch {
        // Skip unparseable files
      }
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter by type if requested
    const filtered = options?.type ? items.filter((b) => b.backupType === options.type) : items;

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated,
      total: filtered.length,
      page,
      limit,
    };
  }

  /**
   * Inspect Backup Package Metadata without restoring
   */
  public async inspectBackup(backupIdOrFilename: string): Promise<BackupInspectionReport> {
    const fullPath = this.resolveBackupPath(backupIdOrFilename);
    if (!fs.existsSync(fullPath)) {
      return {
        manifest: null,
        isValid: false,
        integrityStatus: 'CORRUPTED',
        schemaCompatible: false,
        validationErrors: [`Backup file '${backupIdOrFilename}' not found on storage.`],
      };
    }

    try {
      const rawContent = await fs.promises.readFile(fullPath, 'utf8');
      const parsed = JSON.parse(rawContent);

      if (parsed.manifest && parsed.databaseJson) {
        return this.validator.inspectPackage({
          manifest: parsed.manifest,
          databaseJson: parsed.databaseJson,
          documentsJson: parsed.documentsJson,
        });
      }

      // Legacy format fallback: require valid backup manifest properties
      if (parsed && typeof parsed === 'object' && parsed.backupId && parsed.checksumSha256 && parsed.tableCounts) {
        return {
          manifest: parsed,
          isValid: true,
          integrityStatus: 'VALID',
          schemaCompatible: true,
          validationErrors: [],
        };
      }

      return {
        manifest: null,
        isValid: false,
        integrityStatus: 'CORRUPTED',
        schemaCompatible: false,
        validationErrors: ['Corrupted or invalid backup package: missing manifest or database snapshot.'],
      };
    } catch (err: any) {
      return {
        manifest: null,
        isValid: false,
        integrityStatus: 'CORRUPTED',
        schemaCompatible: false,
        validationErrors: [`Failed to parse backup package: ${err.message}`],
      };
    }
  }

  /**
   * Deep Cryptographic Checksum & Integrity Verification
   */
  public async verifyBackup(backupIdOrFilename: string): Promise<{ valid: boolean; checksum: string; errors: string[] }> {
    const inspection = await this.inspectBackup(backupIdOrFilename);
    return {
      valid: inspection.isValid,
      checksum: inspection.manifest?.checksumSha256 || '',
      errors: inspection.validationErrors,
    };
  }

  /**
   * Delete Backup Snapshot
   */
  public async deleteBackup(backupIdOrFilename: string, user?: { userId?: string }): Promise<boolean> {
    const fullPath = this.resolveBackupPath(backupIdOrFilename);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Backup Delete Error: File '${backupIdOrFilename}' does not exist.`);
    }

    // Check if protected
    try {
      const content = await fs.promises.readFile(fullPath, 'utf8');
      const parsed = JSON.parse(content);
      const manifest: BackupManifestDTO = parsed.manifest || parsed;
      if (manifest?.isProtected) {
        throw new Error('Backup Delete Error: Cannot delete protected backup snapshot.');
      }
    } catch (err: any) {
      if (err.message.includes('protected')) throw err;
    }

    await fs.promises.unlink(fullPath);

    try {
      if (user?.userId) {
        await db.insert(auditLogs).values({
          actorId: user.userId,
          action: 'DELETE',
          entityType: 'backup',
          entityId: backupIdOrFilename,
          afterState: { deleted: true },
        });
      }
    } catch {
      // Non-critical audit failure
    }

    return true;
  }

  /**
   * Rotate and clean up old non-protected backups
   */
  public async cleanupOldBackups(maxRetained = 10): Promise<{ removedCount: number; retainedCount: number }> {
    const list = await this.listBackups({ limit: 100 });
    const nonProtected = list.items.filter((b) => !b.isProtected && b.backupType !== 'SAFETY');

    if (nonProtected.length <= maxRetained) {
      return { removedCount: 0, retainedCount: list.items.length };
    }

    const toRemove = nonProtected.slice(maxRetained);
    let removedCount = 0;

    for (const backup of toRemove) {
      try {
        const fullPath = path.join(this.backupDir, backup.filename);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
          removedCount++;
        }
      } catch {
        // Continue cleaning remaining
      }
    }

    return {
      removedCount,
      retainedCount: list.items.length - removedCount,
    };
  }

  /**
   * Helper: Resolve backup file path by ID or filename
   */
  public resolveBackupPath(backupIdOrFilename: string): string {
    if (backupIdOrFilename.endsWith('.srmbackup') || backupIdOrFilename.endsWith('.srm.json')) {
      return path.join(this.backupDir, path.basename(backupIdOrFilename));
    }

    // Try finding file containing backupId
    const files = fs.existsSync(this.backupDir) ? fs.readdirSync(this.backupDir) : [];
    const matched = files.find(
      (f) => f.toLowerCase().includes(backupIdOrFilename.toLowerCase()) && !f.endsWith('.tmp')
    );

    return matched ? path.join(this.backupDir, matched) : path.join(this.backupDir, `${backupIdOrFilename}.srmbackup`);
  }

  /**
   * Helper: Resolve and validate file path for secure download
   */
  public getBackupFilePath(backupIdOrFilename: string): { fullPath: string; filename: string } {
    const fullPath = this.resolveBackupPath(backupIdOrFilename);
    const resolvedPath = path.resolve(fullPath);
    const resolvedBackupDir = path.resolve(this.backupDir);

    if (!resolvedPath.startsWith(resolvedBackupDir)) {
      throw new Error('Access Denied: Path traversal detected.');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Backup file not found: ${backupIdOrFilename}`);
    }

    return {
      fullPath: resolvedPath,
      filename: path.basename(resolvedPath),
    };
  }
}

export const backupService = new BackupService();
