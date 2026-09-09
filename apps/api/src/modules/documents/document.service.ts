import { eq, and, isNull, sql, inArray } from 'drizzle-orm';
import { db } from '../../database/client';
import { documents, documentAttachments } from '../../database/schema/documents';
import { storageEngine, StorageEngine } from './storage-engine';
import { auditLogs } from '../../database/schema/audit';
import type {
  DocumentCategory,
  DocumentEntityType,
  DocumentDTO,
  DocumentAttachmentDTO,
  UploadDocumentRequest,
  DocumentStorageStats,
  DocumentReconciliationReport,
  UserSession,
} from '@crm/types';

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit

export class DocumentService {
  private storage: StorageEngine;

  constructor(customStorage?: StorageEngine) {
    this.storage = customStorage || storageEngine;
  }

  /**
   * Upload and register a new document
   */
  async uploadDocument(
    fileBuffer: Buffer,
    payload: UploadDocumentRequest,
    user?: { userId?: string; role?: string; permissions?: string[] }
  ): Promise<DocumentDTO> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Upload Error: File content is empty.');
    }

    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Upload Error: File size (${(fileBuffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed limit of 15MB.`);
    }

    const rawFilename = payload.filename || 'document';
    const ext = rawFilename.split('.').pop() || '';
    const extValidation = this.storage.validateExtension(ext);

    if (!extValidation.valid) {
      throw new Error(`Upload Error: File type '.${extValidation.normalizedExt}' is disallowed or blocked for security reasons.`);
    }

    const safeExt = extValidation.normalizedExt;
    const sanitizedFilename = this.storage.sanitizeOriginalFilename(rawFilename);

    // Validate magic bytes
    const isMagicValid = this.storage.validateMagicBytes(fileBuffer, safeExt);
    if (!isMagicValid) {
      throw new Error(`Upload Error: File content does not match the declared extension '.${safeExt}'. MIME spoofing rejected.`);
    }

    // Determine MIME type
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      txt: 'text/plain',
    };
    const mimeType = mimeMap[safeExt] || 'application/octet-stream';
    const checksum = this.storage.calculateSha256(fileBuffer);

    // Save physical file and persist to Supabase cloud storage
    const stored = await this.storage.storeFile(fileBuffer, safeExt, mimeType);

    const category: DocumentCategory = payload.category || 'GENERAL';

    // Insert database record
    const [record] = await db
      .insert(documents)
      .values({
        fileKey: stored.storagePath,
        originalFilename: sanitizedFilename,
        storedFilename: stored.storedFilename,
        storagePath: stored.storagePath,
        mimeType,
        fileExtension: safeExt,
        fileSizeBytes: fileBuffer.length,
        checksumSha256: checksum,
        category,
        status: 'ACTIVE',
        uploadedByUserId: user?.userId || null,
        version: 1,
        metadata: {
          ...(payload.metadata || {}),
          publicUrl: stored.publicUrl || undefined,
        },
      })
      .returning();

    // Auto-attach if entity specified
    if (payload.entityType && payload.entityId) {
      await db.insert(documentAttachments).values({
        documentId: record.id,
        entityType: payload.entityType,
        entityId: payload.entityId,
        attachedByUserId: user?.userId || null,
      });
    }

    // Audit log
    try {
      if (user?.userId) {
        await db.insert(auditLogs).values({
          actorId: user.userId,
          action: 'CREATE',
          entityType: 'document',
          entityId: record.id,
          afterState: {
            filename: sanitizedFilename,
            sizeBytes: fileBuffer.length,
            checksum,
            category,
          },
        });
      }
    } catch {
      // Non-critical audit failure
    }

    return record as unknown as DocumentDTO;
  }

  /**
   * Attach existing document to an entity
   */
  async attachDocument(
    documentId: string,
    entityType: DocumentEntityType,
    entityId: string,
    user?: { userId?: string }
  ): Promise<DocumentAttachmentDTO> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);

    if (!doc) {
      throw new Error(`Attachment Error: Document '${documentId}' not found or has been deleted.`);
    }

    const [attachment] = await db
      .insert(documentAttachments)
      .values({
        documentId,
        entityType,
        entityId,
        attachedByUserId: user?.userId || null,
      })
      .returning();

    return attachment as unknown as DocumentAttachmentDTO;
  }

  /**
   * Detach document relationship
   */
  async detachDocument(attachmentId: string): Promise<boolean> {
    const deleted = await db
      .delete(documentAttachments)
      .where(eq(documentAttachments.id, attachmentId))
      .returning({ id: documentAttachments.id });

    return deleted.length > 0;
  }

  /**
   * Get single document metadata
   */
  async getDocument(documentId: string): Promise<DocumentDTO | null> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);

    return (doc as unknown as DocumentDTO) || null;
  }

  /**
   * List all documents attached to an entity
   */
  async listEntityDocuments(entityType: DocumentEntityType, entityId: string): Promise<DocumentAttachmentDTO[]> {
    const records = await db
      .select({
        id: documentAttachments.id,
        documentId: documentAttachments.documentId,
        entityType: documentAttachments.entityType,
        entityId: documentAttachments.entityId,
        attachedByUserId: documentAttachments.attachedByUserId,
        createdAt: documentAttachments.createdAt,
        document: documents,
      })
      .from(documentAttachments)
      .innerJoin(documents, eq(documentAttachments.documentId, documents.id))
      .where(
        and(
          eq(documentAttachments.entityType, entityType),
          eq(documentAttachments.entityId, entityId),
          isNull(documents.deletedAt)
        )
      );

    return records.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      entityType: r.entityType as DocumentEntityType,
      entityId: r.entityId,
      attachedByUserId: r.attachedByUserId,
      createdAt: r.createdAt,
      document: r.document as unknown as DocumentDTO,
    }));
  }

  /**
   * Download / Stream Document
   */
  async getDocumentStream(
    documentId: string,
    user?: { userId?: string; role?: string; permissions?: string[] }
  ): Promise<{ document: DocumentDTO; stream: NodeJS.ReadableStream }> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);

    if (!doc) {
      throw new Error(`Download Error: Document '${documentId}' not found or is inactive.`);
    }

    let stream: NodeJS.ReadableStream;
    try {
      if (this.storage.fileExists(doc.storagePath)) {
        try {
          stream = this.storage.createReadStream(doc.storagePath);
        } catch {
          const buf = await this.storage.readFile(doc.storagePath);
          const { Readable } = await import('node:stream');
          stream = Readable.from(buf);
        }
      } else {
        await db.update(documents).set({ status: 'STORAGE_MISSING' }).where(eq(documents.id, documentId));
        throw new Error(`Download Error: Physical file is missing from storage.`);
      }
    } catch (err: any) {
      if (err.message.includes('Download Error')) throw err;
      throw new Error(`Download Error: ${err.message}`);
    }

    return {
      document: doc as unknown as DocumentDTO,
      stream,
    };
  }

  /**
   * Soft-delete document
   */
  async deleteDocument(documentId: string, user?: { userId?: string }): Promise<boolean> {
    const [updated] = await db
      .update(documents)
      .set({
        deletedAt: new Date(),
        status: 'DELETED',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning({ id: documents.id });

    return !!updated;
  }

  /**
   * Restore soft-deleted document
   */
  async restoreDocument(documentId: string): Promise<boolean> {
    const [restored] = await db
      .update(documents)
      .set({
        deletedAt: null,
        status: 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning({ id: documents.id });

    return !!restored;
  }

  /**
   * Retrieve storage utilization statistics
   */
  async getStorageStats(): Promise<DocumentStorageStats> {
    const allDocs = await db.select().from(documents).where(isNull(documents.deletedAt));

    let totalSizeBytes = 0;
    const categoryBreakdown: Record<string, { count: number; sizeBytes: number }> = {};
    const statusBreakdown: Record<string, number> = {};

    for (const doc of allDocs) {
      totalSizeBytes += doc.fileSizeBytes;

      if (!categoryBreakdown[doc.category]) {
        categoryBreakdown[doc.category] = { count: 0, sizeBytes: 0 };
      }
      categoryBreakdown[doc.category].count += 1;
      categoryBreakdown[doc.category].sizeBytes += doc.fileSizeBytes;

      statusBreakdown[doc.status] = (statusBreakdown[doc.status] || 0) + 1;
    }

    const mb = totalSizeBytes / (1024 * 1024);
    const formatted = mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;

    return {
      totalDocuments: allDocs.length,
      totalSizeBytes,
      totalSizeBytesFormatted: formatted,
      categoryBreakdown,
      statusBreakdown,
    };
  }

  /**
   * Reconcile physical storage with database records
   */
  async reconcileStorage(): Promise<DocumentReconciliationReport> {
    const startTime = Date.now();
    const physicalScan = await this.storage.scanPhysicalFiles();
    const dbDocs = await db.select().from(documents).where(isNull(documents.deletedAt));

    const physicalSet = new Set(physicalScan.files);
    const dbPathMap = new Map<string, string>(); // storagePath -> docId

    const missingPhysicalFiles: string[] = [];
    const corruptedFiles: string[] = [];
    let matchedFiles = 0;

    for (const doc of dbDocs) {
      dbPathMap.set(doc.storagePath, doc.id);
      if (!physicalSet.has(doc.storagePath)) {
        missingPhysicalFiles.push(doc.id);
        await db.update(documents).set({ status: 'STORAGE_MISSING' }).where(eq(documents.id, doc.id));
      } else {
        matchedFiles += 1;
      }
    }

    const orphanPhysicalFiles: string[] = [];
    for (const file of physicalScan.files) {
      if (!dbPathMap.has(file)) {
        orphanPhysicalFiles.push(file);
      }
    }

    return {
      scannedAt: new Date().toISOString(),
      totalDbRecords: dbDocs.length,
      totalPhysicalFiles: physicalScan.fileCount,
      matchedFiles,
      missingPhysicalFiles,
      orphanPhysicalFiles,
      corruptedFiles,
      durationMs: Date.now() - startTime,
    };
  }
}

export const documentService = new DocumentService();
