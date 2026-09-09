import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { supabaseStorage } from './supabase-storage.service.js';

export interface StorageFileMeta {
  originalFilename: string;
  storedFilename: string;
  storagePath: string; // Relative to storage root
  absolutePath: string;
  mimeType: string;
  fileExtension: string;
  fileSizeBytes: number;
  checksumSha256: string;
}

export const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'docx',
  'xlsx',
  'csv',
  'txt',
]);

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/octet-stream', // allowed for generic binary if extension is in whitelist and magic bytes match
]);

export const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'scr',
  'ps1',
  'vbs',
  'js',
  'ts',
  'sh',
  'jar',
  'msi',
  'dll',
  'pif',
  'zip',
  'rar',
  '7z',
]);

export class StorageEngine {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir || process.env.DOCUMENT_STORAGE_PATH || path.join(process.cwd(), 'storage', 'documents');
    this.ensureDirectoryExists(this.baseDir);
  }

  public getStorageRoot(): string {
    return this.baseDir;
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Path Traversal Defense: Verifies that a path or filename does not escape the storage boundary
   */
  public isSafeFilename(filename: string): boolean {
    if (!filename || typeof filename !== 'string') return false;
    // Reject null bytes, backslashes, forward slashes, parent directory sequences
    if (filename.includes('\0') || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return false;
    }
    // Reject Windows reserved drive letters or device names
    if (/^[a-zA-Z]:/.test(filename) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i.test(filename)) {
      return false;
    }
    return true;
  }

  /**
   * Sanitize original filename for safe display
   */
  public sanitizeOriginalFilename(rawName: string): string {
    const basename = path.basename(rawName || 'document');
    // Strip control characters, replace dangerous chars with underscore
    const sanitized = basename.replace(/[\0\x00-\x1f\x7f<>:"/\\|?*]/g, '_').trim();
    return sanitized.slice(0, 120) || 'document';
  }

  /**
   * Verify file extension against allowlist
   */
  public validateExtension(ext: string): { valid: boolean; normalizedExt: string } {
    const clean = ext.toLowerCase().replace(/^\./, '').trim();
    if (BLOCKED_EXTENSIONS.has(clean)) {
      return { valid: false, normalizedExt: clean };
    }
    const isAllowed = ALLOWED_EXTENSIONS.has(clean);
    return { valid: isAllowed, normalizedExt: clean };
  }

  /**
   * Magic Bytes validation for tamper / spoofing protection
   */
  public validateMagicBytes(buffer: Buffer, ext: string): boolean {
    if (!buffer || buffer.length === 0) return false;
    const normExt = ext.toLowerCase().replace(/^\./, '').trim();

    // 1. PDF: %PDF-
    if (normExt === 'pdf') {
      if (buffer.length < 5) return false;
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    }

    // 2. JPEG: \xFF\xD8\xFF
    if (normExt === 'jpg' || normExt === 'jpeg') {
      if (buffer.length < 3) return false;
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    // 3. PNG: \x89PNG\r\n\x1a\n
    if (normExt === 'png') {
      if (buffer.length < 8) return false;
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }

    // 4. WEBP: RIFF....WEBP
    if (normExt === 'webp') {
      if (buffer.length < 12) return false;
      const riff = buffer.subarray(0, 4).toString('ascii');
      const webp = buffer.subarray(8, 12).toString('ascii');
      return riff === 'RIFF' && webp === 'WEBP';
    }

    // 5. Office ZIP-based (DOCX, XLSX): PK\x03\x04
    if (normExt === 'docx' || normExt === 'xlsx') {
      if (buffer.length < 4) return false;
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    }

    // 6. CSV & Plain Text: check for non-binary content (no null bytes)
    if (normExt === 'csv' || normExt === 'txt') {
      const sampleSize = Math.min(buffer.length, 512);
      for (let i = 0; i < sampleSize; i++) {
        if (buffer[i] === 0) return false; // Null byte indicates binary executable
      }
      return true;
    }

    return false;
  }

  /**
   * Cryptographic SHA-256 hash calculation
   */
  public calculateSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate opaque relative storage path: YYYY/MM/<uuid>.<ext>
   */
  public generateStorageLocation(ext: string): { storedFilename: string; relativePath: string; absolutePath: string } {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const id = crypto.randomUUID();
    const storedFilename = `${id}.${ext}`;
    const relativePath = path.join(year, month, storedFilename).replace(/\\/g, '/');
    const absolutePath = path.join(this.baseDir, year, month, storedFilename);

    return {
      storedFilename,
      relativePath,
      absolutePath,
    };
  }

  /**
   * Store file buffer to disk atomically
   */
  /**
   * Store file buffer to disk and persist to Supabase Storage if configured
   */
  public async storeFile(
    buffer: Buffer,
    ext: string,
    mimeType = 'application/octet-stream'
  ): Promise<{ storedFilename: string; storagePath: string; absolutePath: string; publicUrl?: string }> {
    const loc = this.generateStorageLocation(ext);
    const targetDir = path.dirname(loc.absolutePath);
    this.ensureDirectoryExists(targetDir);

    await fs.promises.writeFile(loc.absolutePath, buffer);

    let publicUrl: string | undefined;
    if (supabaseStorage.isConfigured()) {
      try {
        const uploadResult = await supabaseStorage.uploadFile(loc.relativePath, buffer, mimeType);
        publicUrl = uploadResult.publicUrl;
      } catch (cloudErr) {
        console.warn('[StorageEngine] Supabase cloud upload fallback notice:', cloudErr);
      }
    }

    return {
      storedFilename: loc.storedFilename,
      storagePath: loc.relativePath,
      absolutePath: loc.absolutePath,
      publicUrl,
    };
  }

  /**
   * Resolve safe absolute path from stored relative path
   */
  public resolveAbsolutePath(relativePath: string): string {
    if (!relativePath || relativePath.includes('..') || relativePath.includes('\0')) {
      throw new Error('Security Error: Path traversal attempt detected.');
    }
    const normalized = path.normalize(relativePath);
    const fullPath = path.resolve(this.baseDir, normalized);
    const resolvedBase = path.resolve(this.baseDir);

    // Boundary check: ensure fullPath starts with baseDir
    if (!fullPath.startsWith(resolvedBase)) {
      throw new Error('Security Error: Path traversal attempt detected.');
    }
    return fullPath;
  }

  /**
   * Read file buffer from local disk or Supabase Storage
   */
  public async readFile(relativePath: string): Promise<Buffer> {
    const absPath = this.resolveAbsolutePath(relativePath);
    if (fs.existsSync(absPath)) {
      return fs.promises.readFile(absPath);
    }

    if (supabaseStorage.isConfigured()) {
      try {
        const downloaded = await supabaseStorage.downloadFile(relativePath);
        try {
          this.ensureDirectoryExists(path.dirname(absPath));
          await fs.promises.writeFile(absPath, downloaded);
        } catch {}
        return downloaded;
      } catch (cloudErr) {
        throw new Error(`File not found on local storage or Supabase cloud: ${relativePath}`);
      }
    }

    throw new Error(`File not found on storage: ${relativePath}`);
  }

  /**
   * Create read stream for streaming download
   */
  public createReadStream(relativePath: string): fs.ReadStream {
    const absPath = this.resolveAbsolutePath(relativePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found on storage: ${relativePath}`);
    }
    return fs.createReadStream(absPath);
  }

  /**
   * Delete file from local disk and Supabase Storage
   */
  public async deleteFile(relativePath: string): Promise<boolean> {
    let deleted = false;
    try {
      const absPath = this.resolveAbsolutePath(relativePath);
      if (fs.existsSync(absPath)) {
        await fs.promises.unlink(absPath);
        deleted = true;
      }
    } catch {}

    if (supabaseStorage.isConfigured()) {
      try {
        const cloudDeleted = await supabaseStorage.deleteFile(relativePath);
        if (cloudDeleted) deleted = true;
      } catch {}
    }

    return deleted;
  }

  /**
   * Check if file exists on disk or Supabase Storage
   */
  public fileExists(relativePath: string): boolean {
    try {
      const absPath = this.resolveAbsolutePath(relativePath);
      if (fs.existsSync(absPath)) return true;
      if (supabaseStorage.isConfigured()) return true;
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get public URL for persistent cloud file
   */
  public getPublicUrl(relativePath: string): string {
    if (supabaseStorage.isConfigured()) {
      return supabaseStorage.getPublicUrl(relativePath);
    }
    return '';
  }

  /**
   * Create temporary signed URL for file
   */
  public async createSignedUrl(relativePath: string, expiresInSeconds = 3600): Promise<string> {
    if (supabaseStorage.isConfigured()) {
      return supabaseStorage.createSignedUrl(relativePath, expiresInSeconds);
    }
    return '';
  }

  /**
   * Collect physical storage statistics
   */
  public async scanPhysicalFiles(): Promise<{ fileCount: number; totalSizeBytes: number; files: string[] }> {
    const files: string[] = [];
    let totalSizeBytes = 0;

    const traverse = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          traverse(full);
        } else if (entry.isFile()) {
          const stats = fs.statSync(full);
          totalSizeBytes += stats.size;
          const rel = path.relative(this.baseDir, full).replace(/\\/g, '/');
          files.push(rel);
        }
      }
    };

    traverse(this.baseDir);
    return {
      fileCount: files.length,
      totalSizeBytes,
      files,
    };
  }
}

export const storageEngine = new StorageEngine();
