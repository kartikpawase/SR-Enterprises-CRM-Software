import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabaseStorage } from '../modules/documents/supabase-storage.service';
import { storageEngine } from '../modules/documents/storage-engine';
import { supabaseDbPersistence } from '../database/supabase-db-persistence';
import { ensureDatabaseInitialized, closeDatabaseConnections } from '../database/client';

describe('Supabase Persistent DB & Object Storage Integration Suite', { timeout: 30000 }, () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  it('1. Verifies Supabase Client is configured with provided credentials', () => {
    expect(supabaseStorage.isConfigured()).toBe(true);
    expect(supabaseStorage.getBucket()).toBe('crm-documents');
    const client = supabaseStorage.getClient();
    expect(client).toBeDefined();
    expect(client).not.toBeNull();
  });

  it('2. Verifies listing bucket contents in Supabase Storage', async () => {
    const objects = await supabaseStorage.listObjects();
    expect(Array.isArray(objects)).toBe(true);
  });

  it('3. Uploads, verifies, and downloads a persistent file from Supabase Storage', async () => {
    const testContent = `SR-Enterprises-CRM-Persistence-Verification-${Date.now()}`;
    const testBuffer = Buffer.from(testContent, 'utf8');
    const testPath = `tests/verify-${Date.now()}.txt`;

    // Upload to Supabase Storage
    const uploadRes = await supabaseStorage.uploadFile(testPath, testBuffer, 'text/plain');
    expect(uploadRes).toBeDefined();
    expect(uploadRes.path).toContain('verify-');

    // Verify Public URL
    const publicUrl = supabaseStorage.getPublicUrl(testPath);
    expect(publicUrl).toContain('https://swdrtbdpzjcxptszskll.supabase.co');
    expect(publicUrl).toContain('crm-documents');

    // Download from Supabase Storage
    const downloadedBuffer = await supabaseStorage.downloadFile(testPath);
    expect(downloadedBuffer.toString('utf8')).toBe(testContent);

    // Clean up test file from Supabase
    const deleted = await supabaseStorage.deleteFile(testPath);
    expect(deleted).toBe(true);
  });

  it('4. StorageEngine seamlessly persists and recovers files with Supabase cloud', async () => {
    const docContent = `StorageEngine-Document-${Date.now()}`;
    const docBuffer = Buffer.from(docContent, 'utf8');

    // Store via CRM Storage Engine
    const stored = await storageEngine.storeFile(docBuffer, 'txt', 'text/plain');
    expect(stored.storedFilename).toBeDefined();
    expect(storageEngine.fileExists(stored.storagePath)).toBe(true);

    // Verify read
    const readBuffer = await storageEngine.readFile(stored.storagePath);
    expect(readBuffer.toString('utf8')).toBe(docContent);

    // Clean up
    await storageEngine.deleteFile(stored.storagePath);
  });

  it('5. Synchronizes complete database state snapshot to Supabase Cloud Storage', async () => {
    const syncRes = await supabaseDbPersistence.syncDatabaseSnapshotToSupabase({
      reason: 'integration-test-snapshot',
    });

    expect(syncRes.success).toBe(true);
    expect(syncRes.snapshotKey).toBe('db-snapshots/latest-state.json');

    // Download and inspect snapshot
    const snapshotBuffer = await supabaseStorage.downloadFile('db-snapshots/latest-state.json');
    expect(snapshotBuffer.length).toBeGreaterThan(0);

    const parsed = JSON.parse(snapshotBuffer.toString('utf8'));
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.source).toBe('integration-test-snapshot');
    expect(parsed.tables).toBeDefined();
    expect(typeof parsed.totalRecords).toBe('number');
  });
});
