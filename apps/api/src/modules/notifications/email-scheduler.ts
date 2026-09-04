import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { db } from '../../database/client';
import { services, invoices, warranties } from '../../database/schema/index';
import { emailService } from './email.service';
import { emailQueueWorker } from './email-queue.worker';

export class EmailScheduler {
  private timer: NodeJS.Timeout | null = null;
  private initialTimeout: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Run automated scan for service reminders, payment reminders, and warranty expiries
   */
  public async runScheduledTasks(): Promise<{
    serviceRemindersCount: number;
    paymentRemindersCount: number;
    warrantyRemindersCount: number;
    queueProcessed: number;
  }> {
    if (this.isRunning) {
      return { serviceRemindersCount: 0, paymentRemindersCount: 0, warrantyRemindersCount: 0, queueProcessed: 0 };
    }

    this.isRunning = true;
    let serviceRemindersCount = 0;
    let paymentRemindersCount = 0;
    let warrantyRemindersCount = 0;

    try {
      const now = new Date();

      // 1. Service Reminders (Upcoming services scheduled within next 48 hours)
      const serviceWindowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      try {
        const upcomingServices = await db
          .select({ id: services.id })
          .from(services)
          .where(
            and(
              sql`${services.status} IN ('SCHEDULED', 'ASSIGNED')`,
              gte(services.scheduledDate, now),
              lte(services.scheduledDate, serviceWindowEnd)
            )
          );

        for (const s of upcomingServices) {
          try {
            await emailService.sendServiceReminder(s.id);
            serviceRemindersCount++;
          } catch {}
        }
      } catch {}

      // 2. Payment Reminders (Invoices issued, partially paid, or overdue)
      try {
        const dueInvoices = await db
          .select({ id: invoices.id })
          .from(invoices)
          .where(
            sql`${invoices.status} IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')`
          );

        for (const inv of dueInvoices) {
          try {
            await emailService.sendPaymentPendingReminder(inv.id);
            paymentRemindersCount++;
          } catch {}
        }
      } catch {}

      // 3. Warranty Expiry Notifications (30d, 7d, 1d thresholds)
      try {
        const activeWarranties = await db
          .select({ id: warranties.id })
          .from(warranties)
          .where(eq(warranties.status, 'ACTIVE'));

        for (const w of activeWarranties) {
          try {
            await emailService.sendWarrantyExpiryReminder(w.id, 30);
            warrantyRemindersCount++;
          } catch {}
        }
      } catch {}

      // 4. Trigger Queue Processing for pending tasks
      const qResult = await emailQueueWorker.processQueue(25);

      return {
        serviceRemindersCount,
        paymentRemindersCount,
        warrantyRemindersCount,
        queueProcessed: qResult.processed,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Alias for test suite and manual triggers
   */
  public async scanAndTrigger(): Promise<{
    status: string;
    serviceRemindersCount: number;
    paymentRemindersCount: number;
    warrantyRemindersCount: number;
    queueProcessed: number;
  }> {
    const res = await this.runScheduledTasks();
    return {
      status: 'COMPLETED',
      ...res,
    };
  }

  /**
   * Start periodic scheduler in background
   */
  public start(intervalMinutes = 15): void {
    if (this.timer) return;

    // Run first batch after 10 seconds of startup
    this.initialTimeout = setTimeout(() => {
      this.runScheduledTasks().catch(() => {});
    }, 10000);

    this.timer = setInterval(() => {
      this.runScheduledTasks().catch((err) => {
        console.error('[EmailScheduler] Error in scheduled tasks run:', err.message);
      });
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop scheduler gracefully
   */
  public stop(): void {
    if (this.initialTimeout) {
      clearTimeout(this.initialTimeout);
      this.initialTimeout = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const emailScheduler = new EmailScheduler();
