import { db } from './client';

export type TransactionCallback<T> = (tx: any) => Promise<T>;

/**
 * Execute a unit of work inside an ACID PostgreSQL transaction.
 * Automatically commits on success and rolls back on error.
 */
export async function withTransaction<T>(
  callback: TransactionCallback<T>,
  options?: { isolationLevel?: 'read committed' | 'repeatable read' | 'serializable'; timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs || 15000;

  return await db.transaction(async (tx: any) => {
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const timeoutErr = new Error(`Database transaction timed out after ${timeoutMs}ms`);
        (timeoutErr as any).code = 'TRANSACTION_TIMEOUT';
        reject(timeoutErr);
      }, timeoutMs);
    });

    try {
      return await Promise.race([
        callback(tx),
        timeoutPromise,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }, options?.isolationLevel ? { isolationLevel: options.isolationLevel } : undefined);
}

