import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

// Node 20 runtime compatibility for @supabase/supabase-js
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class DummyWebSocket {};
}

export interface SupabaseUploadResult {
  path: string;
  id?: string;
  fullPath?: string;
  publicUrl?: string;
  signedUrl?: string;
}

export class SupabaseStorageService {
  private client: SupabaseClient | null = null;
  private bucket: string;

  constructor() {
    this.bucket = env.SUPABASE_STORAGE_BUCKET || 'crm-documents';
    this.initClient();
  }

  private initClient(): void {
    const supabaseUrl = env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SERVICE_ROLE_SECREAT ||
      process.env.SERVICE_ROLE_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      try {
        this.client = createClient(supabaseUrl, serviceKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        console.log(`[Supabase Storage] Initialized client for bucket: ${this.bucket}`);
      } catch (err) {
        console.warn('[Supabase Storage] Initialization warning:', err);
        this.client = null;
      }
    }
  }

  public isConfigured(): boolean {
    if (!this.client) {
      this.initClient();
    }
    return Boolean(this.client);
  }

  public getClient(): SupabaseClient | null {
    if (!this.client) {
      this.initClient();
    }
    return this.client;
  }

  public getBucket(): string {
    return this.bucket;
  }

  /**
   * List objects in bucket with optional folder prefix
   */
  public async listObjects(prefix = ''): Promise<{ name: string; id?: string | null; updated_at?: string | null; metadata?: any }[]> {
    if (!this.isConfigured() || !this.client) return [];
    try {
      const { data, error } = await this.client.storage.from(this.bucket).list(prefix, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) {
        console.warn('[Supabase Storage] listObjects error:', error.message);
        return [];
      }
      return data || [];
    } catch (err: any) {
      console.warn('[Supabase Storage] listObjects exception:', err?.message || err);
      return [];
    }
  }

  /**
   * Ensures the target storage bucket exists on Supabase
   */
  public async ensureBucket(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { data: buckets, error: listErr } = await this.client.storage.listBuckets();
      if (listErr) {
        console.warn('[Supabase Storage] listBuckets notice:', listErr.message);
        return false;
      }

      const found = buckets?.some((b) => b.name === this.bucket || b.id === this.bucket);
      if (!found) {
        const { error: createErr } = await this.client.storage.createBucket(this.bucket, {
          public: true,
          fileSizeLimit: 50 * 1024 * 1024, // 50MB
        });
        if (createErr) {
          console.warn('[Supabase Storage] createBucket notice:', createErr.message);
          return false;
        }
      }
      return true;
    } catch (err: any) {
      console.warn('[Supabase Storage] ensureBucket error:', err?.message || err);
      return false;
    }
  }

  /**
   * Upload binary buffer to Supabase Storage
   */
  public async uploadFile(
    storagePath: string,
    fileBuffer: Buffer,
    mimeType = 'application/octet-stream'
  ): Promise<SupabaseUploadResult> {
    if (!this.client) {
      throw new Error('Supabase Storage is not configured with valid credentials.');
    }

    const cleanPath = storagePath.replace(/^\/+/, '');
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(cleanPath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error('[Supabase Storage] Upload failure:', error);
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    const { data: urlData } = this.client.storage.from(this.bucket).getPublicUrl(cleanPath);

    return {
      path: data.path,
      id: data.id,
      fullPath: data.fullPath,
      publicUrl: urlData?.publicUrl,
    };
  }

  /**
   * Download file binary buffer from Supabase Storage
   */
  public async downloadFile(storagePath: string): Promise<Buffer> {
    if (!this.client) {
      throw new Error('Supabase Storage is not configured.');
    }

    const cleanPath = storagePath.replace(/^\/+/, '');
    const { data, error } = await this.client.storage.from(this.bucket).download(cleanPath);

    if (error || !data) {
      throw new Error(`Supabase Storage download failed: ${error?.message || 'Empty file'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get public URL for a file in Supabase Storage
   */
  public getPublicUrl(storagePath: string): string {
    if (!this.client) return '';
    const cleanPath = storagePath.replace(/^\/+/, '');
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(cleanPath);
    return data?.publicUrl || '';
  }

  /**
   * Generate temporary signed download URL (e.g. 1 hour)
   */
  public async createSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    if (!this.client) return '';
    const cleanPath = storagePath.replace(/^\/+/, '');
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      // Fall back to public URL
      return this.getPublicUrl(cleanPath);
    }

    return data.signedUrl;
  }

  /**
   * Delete file from Supabase Storage
   */
  public async deleteFile(storagePath: string): Promise<boolean> {
    if (!this.client) return false;
    const cleanPath = storagePath.replace(/^\/+/, '');
    const { error } = await this.client.storage.from(this.bucket).remove([cleanPath]);
    return !error;
  }
}

export const supabaseStorage = new SupabaseStorageService();
