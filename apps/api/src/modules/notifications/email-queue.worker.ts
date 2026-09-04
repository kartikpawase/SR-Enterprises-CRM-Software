import { eq, and, lte, sql } from 'drizzle-orm';
import { db } from '../../database/client';
import { emailQueue, emailNotifications } from '../../database/schema/email-notifications';
import { customers } from '../../database/schema/customers';
import { phpMailerService, type TransactionalEmailPayload } from './php-mailer.service';
import { randomUUID } from 'crypto';

export interface EnqueueEmailJobInput {
  customerId?: string | null;
  eventType: TransactionalEmailPayload['eventType'];
  referenceType?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  payload: Record<string, any>;
  attachInvoicePdf?: boolean;
}

// Resilient memory store for offline desktop and local dev
const memoryEmailQueue: any[] = [];
const memoryEmailNotifications: any[] = [];

export class EmailQueueWorker {
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;

  /**
   * Enqueue email job into database with idempotency check
   */
  public async enqueue(input: EnqueueEmailJobInput): Promise<{
    notificationId: string;
    queueId: string;
    jobId?: string;
    recipientEmail?: string;
    idempotencyKey?: string;
    isDuplicate: boolean;
    status: string;
  }> {
    // 0. Authoritative Customer Resolution: Database is the single source of truth for email
    if (input.customerId) {
      try {
        const [currentCust] = await db
          .select({
            email: customers.email,
            fullName: customers.fullName,
          })
          .from(customers)
          .where(eq(customers.id, input.customerId));

        if (currentCust) {
          input.recipientEmail = currentCust.email ? currentCust.email.trim().toLowerCase() : '';
          if (currentCust.fullName) {
            input.recipientName = currentCust.fullName;
          }
          if (input.payload) {
            input.payload.customerEmail = input.recipientEmail;
            input.payload.toEmail = input.recipientEmail;
            if (currentCust.fullName) {
              input.payload.customerName = currentCust.fullName;
              input.payload.toName = currentCust.fullName;
            }
            if (input.payload.invoiceData) {
              input.payload.invoiceData.customerEmail = input.recipientEmail;
              if (currentCust.fullName) {
                input.payload.invoiceData.customerName = currentCust.fullName;
              }
            }
          }
        }
      } catch {}
    }

    const idempotencyKey = input.idempotencyKey || `${input.eventType}:${input.referenceType || 'REF'}:${input.referenceId || randomUUID()}`;

    // 1. Idempotency check: check if notification with this idempotency key already exists
    try {
      const [existing] = await db
        .select()
        .from(emailNotifications)
        .where(eq(emailNotifications.idempotencyKey, idempotencyKey));

      if (existing) {
        return {
          notificationId: existing.id,
          queueId: '',
          jobId: existing.id,
          recipientEmail: existing.recipientEmail || input.recipientEmail,
          idempotencyKey,
          isDuplicate: true,
          status: existing.status,
        };
      }
    } catch {
      const memExisting = memoryEmailNotifications.find((n) => n.idempotencyKey === idempotencyKey);
      if (memExisting) {
        return {
          notificationId: memExisting.id,
          queueId: '',
          jobId: memExisting.id,
          recipientEmail: memExisting.recipientEmail || input.recipientEmail,
          idempotencyKey,
          isDuplicate: true,
          status: memExisting.status,
        };
      }
    }

    // 2. Validate email recipient
    const hasValidEmail = Boolean(input.recipientEmail && input.recipientEmail.includes('@'));
    const initialStatus = hasValidEmail ? 'PENDING' : 'SKIPPED';
    const lastError = hasValidEmail ? null : 'EMAIL_SKIPPED_NO_VALID_ADDRESS: Customer has no valid email address';

    let notificationId = randomUUID();
    let queueId = randomUUID();

    try {
      // Insert into email_notifications audit table
      const [notifRecord] = await db
        .insert(emailNotifications)
        .values({
          customerId: input.customerId || null,
          eventType: input.eventType,
          referenceType: input.referenceType || null,
          referenceId: input.referenceId || null,
          idempotencyKey,
          recipientEmail: input.recipientEmail || '',
          recipientName: input.recipientName || null,
          subject: input.subject,
          status: initialStatus,
          lastError,
          pdfAttached: Boolean(input.attachInvoicePdf),
          metadata: {
            referenceType: input.referenceType,
            referenceId: input.referenceId,
          },
        })
        .returning();

      if (notifRecord) {
        notificationId = notifRecord.id;
      }

      // If valid, enqueue into email_queue
      if (hasValidEmail) {
        const fullPayload: TransactionalEmailPayload = {
          ...input.payload,
          eventType: input.eventType,
          toEmail: input.recipientEmail,
          toName: input.recipientName || 'Valued Customer',
          subject: input.subject,
          customerId: input.customerId || undefined,
          referenceType: input.referenceType || undefined,
          referenceId: input.referenceId || undefined,
          attachInvoicePdf: input.attachInvoicePdf,
        };

        const [qRecord] = await db
          .insert(emailQueue)
          .values({
            notificationId,
            eventType: input.eventType,
            referenceType: input.referenceType || null,
            referenceId: input.referenceId || null,
            recipientEmail: input.recipientEmail,
            payload: fullPayload,
            status: 'PENDING',
            attempts: 0,
            maxAttempts: 3,
            nextAttemptAt: new Date(),
          })
          .returning();

        if (qRecord) {
          queueId = qRecord.id;
        }
      }
    } catch {
      // Memory fallback
      const notifObj = {
        id: notificationId,
        customerId: input.customerId || null,
        eventType: input.eventType,
        referenceType: input.referenceType || null,
        referenceId: input.referenceId || null,
        idempotencyKey,
        recipientEmail: input.recipientEmail || '',
        recipientName: input.recipientName || null,
        subject: input.subject,
        status: initialStatus,
        lastError,
        pdfAttached: Boolean(input.attachInvoicePdf),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryEmailNotifications.unshift(notifObj);

      if (hasValidEmail) {
        const fullPayload: TransactionalEmailPayload = {
          ...input.payload,
          eventType: input.eventType,
          toEmail: input.recipientEmail,
          toName: input.recipientName || 'Valued Customer',
          subject: input.subject,
          customerId: input.customerId || undefined,
          referenceType: input.referenceType || undefined,
          referenceId: input.referenceId || undefined,
          attachInvoicePdf: input.attachInvoicePdf,
        };

        const qObj = {
          id: queueId,
          notificationId,
          eventType: input.eventType,
          referenceType: input.referenceType || null,
          referenceId: input.referenceId || null,
          recipientEmail: input.recipientEmail,
          payload: fullPayload,
          status: 'PENDING',
          attempts: 0,
          maxAttempts: 3,
          nextAttemptAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryEmailQueue.unshift(qObj);
      }
    }

    // Trigger asynchronous queue drain without blocking caller
    setImmediate(() => {
      this.processQueue().catch(() => {});
    });

    return {
      notificationId,
      queueId,
      jobId: notificationId,
      recipientEmail: input.recipientEmail,
      idempotencyKey,
      isDuplicate: false,
      status: initialStatus,
    };
  }

  /**
   * Process pending jobs in email queue with exponential backoff
   */
  public async processQueue(batchSize = 10): Promise<{ processed: number; successCount: number; failedCount: number }> {
    if (this.isProcessing) {
      return { processed: 0, successCount: 0, failedCount: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let successCount = 0;
    let failedCount = 0;

    try {
      const now = new Date();

      // 1. Fetch pending items due for processing from DB
      let jobs: any[] = [];
      try {
        jobs = await db
          .select()
          .from(emailQueue)
          .where(
            and(
              eq(emailQueue.status, 'PENDING'),
              lte(emailQueue.nextAttemptAt, now)
            )
          )
          .limit(batchSize);
      } catch {
        jobs = memoryEmailQueue.filter(
          (j) => j.status === 'PENDING' && new Date(j.nextAttemptAt) <= now
        ).slice(0, batchSize);
      }

      for (const job of jobs) {
        processed++;
        const currentAttempts = (job.attempts || 0) + 1;

        try {
          // Mark job as PROCESSING
          try {
            await db
              .update(emailQueue)
              .set({ status: 'PROCESSING', attempts: currentAttempts, updatedAt: new Date() })
              .where(eq(emailQueue.id, job.id));
          } catch {
            job.status = 'PROCESSING';
            job.attempts = currentAttempts;
          }

          // Re-verify single source of truth for customer email immediately prior to dispatch
          const resolvedCustomerId = job.payload?.customerId || job.customerId;
          if (resolvedCustomerId) {
            try {
              const [liveCust] = await db
                .select({
                  email: customers.email,
                  fullName: customers.fullName,
                })
                .from(customers)
                .where(eq(customers.id, resolvedCustomerId));

              if (liveCust) {
                const freshEmail = liveCust.email ? liveCust.email.trim().toLowerCase() : '';
                job.payload.toEmail = freshEmail;
                job.recipientEmail = freshEmail;
                if (liveCust.fullName) {
                  job.payload.toName = liveCust.fullName;
                  job.recipientName = liveCust.fullName;
                }
                if (job.payload.invoiceData) {
                  job.payload.invoiceData.customerEmail = freshEmail;
                  if (liveCust.fullName) {
                    job.payload.invoiceData.customerName = liveCust.fullName;
                  }
                }
              }
            } catch {}
          }

          if (!job.payload?.toEmail || !job.payload.toEmail.includes('@')) {
            const sentDate = new Date();
            const skipReason = 'EMAIL_SKIPPED_NO_VALID_ADDRESS: Customer has no valid email address';
            try {
              await db
                .update(emailQueue)
                .set({ status: 'SKIPPED', lastError: skipReason, updatedAt: sentDate })
                .where(eq(emailQueue.id, job.id));
            } catch {}
            if (job.notificationId) {
              try {
                await db
                  .update(emailNotifications)
                  .set({ status: 'SKIPPED', lastError: skipReason, updatedAt: sentDate })
                  .where(eq(emailNotifications.id, job.notificationId));
              } catch {}
            }
            continue;
          }

          // Execute dispatch via PHPMailer
          const result = await phpMailerService.dispatch(job.payload);

          if (result.success) {
            successCount++;
            const sentDate = new Date();

            // Mark queue job as SENT
            try {
              await db
                .update(emailQueue)
                .set({ status: 'SENT', sentAt: sentDate, lastError: null, updatedAt: sentDate })
                .where(eq(emailQueue.id, job.id));
            } catch {
              job.status = 'SENT';
              job.sentAt = sentDate;
            }

            // Update email_notifications audit record
            if (job.notificationId) {
              try {
                await db
                  .update(emailNotifications)
                  .set({
                    status: 'SENT',
                    sentAt: sentDate,
                    lastError: null,
                    attemptCount: currentAttempts,
                    pdfAttached: Boolean(result.pdfAttached),
                    updatedAt: sentDate,
                  })
                  .where(eq(emailNotifications.id, job.notificationId));
              } catch {
                const memN = memoryEmailNotifications.find((n) => n.id === job.notificationId);
                if (memN) {
                  memN.status = 'SENT';
                  memN.sentAt = sentDate;
                  memN.attemptCount = currentAttempts;
                }
              }
            }
          } else if (result.status === 'SKIPPED') {
            // Skipped (e.g. invalid email)
            try {
              await db
                .update(emailQueue)
                .set({ status: 'SKIPPED', lastError: result.error || 'SKIPPED', updatedAt: new Date() })
                .where(eq(emailQueue.id, job.id));
            } catch {
              job.status = 'SKIPPED';
              job.lastError = result.error;
            }

            if (job.notificationId) {
              try {
                await db
                  .update(emailNotifications)
                  .set({
                    status: 'SKIPPED',
                    lastError: result.error || 'SKIPPED',
                    attemptCount: currentAttempts,
                    updatedAt: new Date(),
                  })
                  .where(eq(emailNotifications.id, job.notificationId));
              } catch {}
            }
          } else {
            // Failed: check retry eligibility
            failedCount++;
            const maxAttempts = job.maxAttempts || 3;
            const hasRetriesLeft = currentAttempts < maxAttempts;
            const newStatus = hasRetriesLeft ? 'PENDING' : 'FAILED';
            // Exponential backoff: 1min, 2min, 4min
            const backoffSeconds = Math.pow(2, currentAttempts - 1) * 60;
            const nextAttempt = new Date(Date.now() + backoffSeconds * 1000);

            try {
              await db
                .update(emailQueue)
                .set({
                  status: newStatus,
                  nextAttemptAt: nextAttempt,
                  lastError: result.error || 'Unknown dispatch error',
                  updatedAt: new Date(),
                })
                .where(eq(emailQueue.id, job.id));
            } catch {
              job.status = newStatus;
              job.nextAttemptAt = nextAttempt;
              job.lastError = result.error;
            }

            if (job.notificationId) {
              try {
                await db
                  .update(emailNotifications)
                  .set({
                    status: newStatus,
                    failedAt: hasRetriesLeft ? null : new Date(),
                    lastError: result.error || 'Unknown dispatch error',
                    attemptCount: currentAttempts,
                    updatedAt: new Date(),
                  })
                  .where(eq(emailNotifications.id, job.notificationId));
              } catch {
                const memN = memoryEmailNotifications.find((n) => n.id === job.notificationId);
                if (memN) {
                  memN.status = newStatus;
                  memN.lastError = result.error;
                  memN.attemptCount = currentAttempts;
                }
              }
            }
          }
        } catch (err: any) {
          failedCount++;
          const errorMsg = err.message || 'Worker exception';
          try {
            await db
              .update(emailQueue)
              .set({
                status: currentAttempts < (job.maxAttempts || 3) ? 'PENDING' : 'FAILED',
                nextAttemptAt: new Date(Date.now() + 60000),
                lastError: errorMsg,
                updatedAt: new Date(),
              })
              .where(eq(emailQueue.id, job.id));
          } catch {}
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, successCount, failedCount };
  }

  /**
   * Start periodic background queue runner
   */
  public startPeriodicRunner(intervalMs = 30000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processQueue().catch((err) => {
        console.error('[EmailQueueWorker] Error running queue processor:', err.message);
      });
    }, intervalMs);
  }

  /**
   * Stop periodic background queue runner
   */
  public stopPeriodicRunner(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Get queue health stats
   */
  public async getStats(): Promise<{ pending: number; sent: number; failed: number }> {
    try {
      const all = await db
        .select({
          status: emailNotifications.status,
          count: sql<number>`count(*)::int`,
        })
        .from(emailNotifications)
        .groupBy(emailNotifications.status);

      const stats = { pending: 0, sent: 0, failed: 0 };
      for (const row of all) {
        if (row.status === 'PENDING' || row.status === 'PROCESSING') stats.pending += Number(row.count);
        if (row.status === 'SENT') stats.sent += Number(row.count);
        if (row.status === 'FAILED') stats.failed += Number(row.count);
      }
      return stats;
    } catch {
      return {
        pending: memoryEmailNotifications.filter((n) => n.status === 'PENDING').length,
        sent: memoryEmailNotifications.filter((n) => n.status === 'SENT').length,
        failed: memoryEmailNotifications.filter((n) => n.status === 'FAILED').length,
      };
    }
  }
}

export const emailQueueWorker = new EmailQueueWorker();
