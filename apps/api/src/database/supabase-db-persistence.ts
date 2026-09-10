import { db, sql } from './client';
import { supabaseStorage } from '../modules/documents/supabase-storage.service';
import { ORDERED_DOMAIN_TABLES } from '../modules/backup/backup.service';

export interface DatabaseSnapshotPayload {
  version: string;
  createdAt: string;
  source: string;
  totalRecords: number;
  tableCounts: Record<string, number>;
  tables: Record<string, Record<string, any>[]>;
}

export class SupabaseDatabasePersistenceService {
  private isSyncing = false;
  private isRestoring = false;

  /**
   * Serializes current database state into JSON and stores it in Supabase Storage
   */
  public async syncDatabaseSnapshotToSupabase(options?: {
    reason?: string;
  }): Promise<{ success: boolean; snapshotKey: string; totalRecords: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, snapshotKey: '', totalRecords: 0, error: 'Sync already in progress' };
    }

    if (!supabaseStorage.isConfigured()) {
      return {
        success: false,
        snapshotKey: '',
        totalRecords: 0,
        error: 'Supabase credentials not configured',
      };
    }

    this.isSyncing = true;
    try {
      const tablesData: Record<string, Record<string, any>[]> = {};
      const tableCounts: Record<string, number> = {};
      let totalRecords = 0;

      for (const table of ORDERED_DOMAIN_TABLES) {
        try {
          const rows: any[] = await sql.unsafe(`SELECT * FROM "${table}"`);
          if (rows && rows.length > 0) {
            tablesData[table] = rows;
            tableCounts[table] = rows.length;
            totalRecords += rows.length;
          }
        } catch {
          // Suppress if optional table does not exist
        }
      }

      const payload: DatabaseSnapshotPayload = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        source: options?.reason || 'auto-persistence',
        totalRecords,
        tableCounts,
        tables: tablesData,
      };

      const jsonBuffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');
      const snapshotKey = 'db-snapshots/latest-state.json';

      await supabaseStorage.uploadFile(snapshotKey, jsonBuffer, 'application/json');
      console.log(
        `[Supabase Persistence] Database state successfully backed up to Supabase Cloud (${totalRecords} records across ${Object.keys(tablesData).length} tables)`
      );

      return { success: true, snapshotKey, totalRecords };
    } catch (err: any) {
      console.warn('[Supabase Persistence] Sync notice:', err?.message || err);
      return { success: false, snapshotKey: '', totalRecords: 0, error: err?.message || String(err) };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Restores database state from latest Supabase Cloud snapshot
   */
  public async restoreDatabaseSnapshotFromSupabase(): Promise<{
    restored: boolean;
    recordCount: number;
    error?: string;
  }> {
    if (this.isRestoring) {
      return { restored: false, recordCount: 0, error: 'Restore already in progress' };
    }

    if (!supabaseStorage.isConfigured()) {
      return { restored: false, recordCount: 0, error: 'Supabase credentials not configured' };
    }

    this.isRestoring = true;
    try {
      const snapshotKey = 'db-snapshots/latest-state.json';
      let buffer: Buffer;

      try {
        buffer = await supabaseStorage.downloadFile(snapshotKey);
      } catch (dlErr: any) {
        // No snapshot found in cloud yet
        return { restored: false, recordCount: 0, error: 'No cloud snapshot found' };
      }

      const payload: DatabaseSnapshotPayload = JSON.parse(buffer.toString('utf8'));
      if (!payload || !payload.tables) {
        return { restored: false, recordCount: 0, error: 'Invalid snapshot format' };
      }

      let restoredCount = 0;

      for (const table of ORDERED_DOMAIN_TABLES) {
        const rows = payload.tables[table];
        if (!rows || rows.length === 0) continue;

        for (const row of rows) {
          const keys = Object.keys(row);
          const columns = keys.map((k) => `"${k}"`).join(', ');
          const formattedValues = keys
            .map((k) => {
              const v = row[k];
              if (v === null || v === undefined) return 'NULL';
              if (table === 'technicians' && k === 'skills') {
                if (Array.isArray(v)) {
                  if (v.length === 0) return 'ARRAY[]::text[]';
                  return `ARRAY[${v.map((item) => `'${String(item).replace(/'/g, "''")}'`).join(', ')}]::text[]`;
                }
              }
              if (typeof v === 'number' || typeof v === 'boolean') return `${v}`;
              if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
              return `'${String(v).replace(/'/g, "''")}'`;
            })
            .join(', ');

          try {
            await sql.unsafe(
              `INSERT INTO "${table}" (${columns}) VALUES (${formattedValues}) ON CONFLICT DO NOTHING;`
            );
            restoredCount++;
          } catch {
            // Non-fatal row conflict
          }
        }
      }

      console.log(`[Supabase Persistence] Successfully restored ${restoredCount} records from Supabase Cloud snapshot`);
      return { restored: true, recordCount: restoredCount };
    } catch (err: any) {
      console.warn('[Supabase Persistence] Restore notice:', err?.message || err);
      return { restored: false, recordCount: 0, error: err?.message || String(err) };
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Invoked on startup: checks if database is empty, and if so, auto-restores from Supabase Cloud.
   * If database already contains data, keeps cloud snapshot up to date.
   */
  public async ensureDatabaseRestoredFromCloud(): Promise<void> {
    if (!supabaseStorage.isConfigured()) return;

    try {
      let userCount = 0;
      let customerCount = 0;

      try {
        const usersRes: any[] = await sql.unsafe('SELECT count(*) as count FROM "users"');
        userCount = Number(usersRes?.[0]?.count || 0);
      } catch {}

      try {
        const custRes: any[] = await sql.unsafe('SELECT count(*) as count FROM "customers"');
        customerCount = Number(custRes?.[0]?.count || 0);
      } catch {}

      if (userCount === 0 && customerCount === 0) {
        console.log('[Supabase Persistence] Fresh/empty local database detected. Checking Supabase Cloud for persistent state...');
        const result = await this.restoreDatabaseSnapshotFromSupabase();
        if (result.restored) {
          console.log(`[Supabase Persistence] Persistent database restored from Supabase Cloud (${result.recordCount} records).`);
        }
      } else {
        // Active database has records — update cloud snapshot asynchronously so cloud is always persistent
        setTimeout(() => {
          this.syncDatabaseSnapshotToSupabase({ reason: 'periodic-cloud-sync' }).catch(() => {});
        }, 5000);
      }
    } catch (err) {
      console.warn('[Supabase Persistence] Cloud state check notice:', err);
    }
  }
}

export const supabaseDbPersistence = new SupabaseDatabasePersistenceService();
