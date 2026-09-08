import { db } from '../../database/client';
import { appSettings } from '../../database/schema/settings';
import { eq } from 'drizzle-orm';
import { backupService, BackupService } from './backup.service';

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY';
  time: string; // "HH:MM" e.g. "02:00"
  retentionCount: number;
  lastRunTime?: string | null;
}

const DEFAULT_SCHEDULE_CONFIG: BackupScheduleConfig = {
  enabled: false,
  frequency: 'DAILY',
  time: '02:00',
  retentionCount: 7,
  lastRunTime: null,
};

export class BackupScheduler {
  private backupService: BackupService;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private currentConfig: BackupScheduleConfig = { ...DEFAULT_SCHEDULE_CONFIG };

  constructor(customBackupService?: BackupService) {
    this.backupService = customBackupService || backupService;
  }

  /**
   * Initialize scheduler: loads persistent config from DB and starts periodic evaluation
   */
  public async initialize(): Promise<void> {
    try {
      this.currentConfig = await this.getConfig();
      this.start();
    } catch {
      this.currentConfig = { ...DEFAULT_SCHEDULE_CONFIG };
      this.start();
    }
  }

  /**
   * Start periodic timer (evaluates every 60 seconds)
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalTimer = setInterval(() => {
      this.evaluateSchedule().catch(() => {});
    }, 60 * 1000);
  }

  /**
   * Stop periodic timer
   */
  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
  }

  /**
   * Get current schedule config from database
   */
  public async getConfig(): Promise<BackupScheduleConfig> {
    try {
      const rows = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.category, 'BACKUP_SCHEDULE'))
        .limit(1);

      if (rows.length > 0 && rows[0]?.value) {
        const val = rows[0].value as any;
        this.currentConfig = {
          enabled: typeof val.enabled === 'boolean' ? val.enabled : DEFAULT_SCHEDULE_CONFIG.enabled,
          frequency: val.frequency === 'WEEKLY' ? 'WEEKLY' : 'DAILY',
          time: typeof val.time === 'string' && /^\d{2}:\d{2}$/.test(val.time) ? val.time : DEFAULT_SCHEDULE_CONFIG.time,
          retentionCount: typeof val.retentionCount === 'number' && val.retentionCount > 0 ? val.retentionCount : DEFAULT_SCHEDULE_CONFIG.retentionCount,
          lastRunTime: val.lastRunTime || null,
        };
        return this.currentConfig;
      }
    } catch {
      // Return cached/default
    }

    return this.currentConfig;
  }

  /**
   * Update schedule configuration in database
   */
  public async updateConfig(
    patch: Partial<BackupScheduleConfig>,
    user?: { userId?: string }
  ): Promise<BackupScheduleConfig> {
    const existing = await this.getConfig();
    const updated: BackupScheduleConfig = {
      enabled: patch.enabled !== undefined ? !!patch.enabled : existing.enabled,
      frequency: patch.frequency === 'WEEKLY' ? 'WEEKLY' : 'DAILY',
      time: typeof patch.time === 'string' && /^\d{2}:\d{2}$/.test(patch.time) ? patch.time : existing.time,
      retentionCount: typeof patch.retentionCount === 'number' && patch.retentionCount >= 1 ? patch.retentionCount : existing.retentionCount,
      lastRunTime: patch.lastRunTime !== undefined ? patch.lastRunTime : existing.lastRunTime,
    };

    try {
      const existingRow = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.category, 'BACKUP_SCHEDULE'))
        .limit(1);

      if (existingRow.length > 0) {
        await db
          .update(appSettings)
          .set({
            value: updated,
            updatedAt: new Date(),
            updatedBy: user?.userId || null,
          })
          .where(eq(appSettings.category, 'BACKUP_SCHEDULE'));
      } else {
        await db.insert(appSettings).values({
          category: 'BACKUP_SCHEDULE',
          value: updated,
          updatedBy: user?.userId || null,
        });
      }
    } catch {
      // In-memory fallback
    }

    this.currentConfig = updated;
    return updated;
  }

  /**
   * Evaluate if scheduled backup should execute right now
   */
  public async evaluateSchedule(): Promise<boolean> {
    const config = this.currentConfig;
    if (!config.enabled) {
      return false;
    }

    if (this.backupService.isOperationInProgress()) {
      return false;
    }

    const now = new Date();
    const [targetHour, targetMinute] = (config.time || '02:00').split(':').map(Number);

    // Check if current time has reached or passed the target hour:minute today
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isPastTargetTime = currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute);

    if (!isPastTargetTime) {
      return false;
    }

    // Check last run date
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastRunStr = config.lastRunTime ? config.lastRunTime.slice(0, 10) : null;

    if (config.frequency === 'DAILY') {
      if (lastRunStr === todayStr) {
        return false; // Already ran today
      }
    } else if (config.frequency === 'WEEKLY') {
      if (config.lastRunTime) {
        const lastRunDate = new Date(config.lastRunTime);
        const diffDays = (now.getTime() - lastRunDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 6.9) {
          return false; // Less than 7 days since last weekly run
        }
      }
    }

    try {
      const runIso = now.toISOString();
      await this.backupService.createBackup({
        backupType: 'SCHEDULED',
        includeDocuments: true,
        notes: `Automated ${config.frequency} Backup`,
      });

      // Update last run time in state & DB
      await this.updateConfig({ lastRunTime: runIso });

      // Run retention cleanup
      await this.backupService.cleanupOldBackups(config.retentionCount);
      return true;
    } catch {
      return false;
    }
  }

  public getStatus(): { isRunning: boolean; config: BackupScheduleConfig } {
    return {
      isRunning: this.isRunning,
      config: this.currentConfig,
    };
  }
}

export const backupScheduler = new BackupScheduler();
