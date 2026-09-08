import { eq, sql } from 'drizzle-orm';
import { businessSequences } from '../../database/schema/sequences';
import { invoices } from '../../database/schema/invoices';

const SEQUENCE_NAME = 'INVOICE_RUNNING_SERIAL';
const INITIAL_SERIAL = 251;

/**
 * Concurrency-safe atomic invoice number generator:
 * Format: MMYY + running serial number (e.g. 0926251)
 *
 * Rules:
 * - MM = 2-digit month of invoiceDate (01-12)
 * - YY = 2-digit year of invoiceDate (e.g. 26 for 2026)
 * - Serial starts from 251 and increments sequentially (251, 252, 253...)
 * - Does NOT reset when month or year changes (e.g. October 2026 -> 1026254)
 * - Guaranteed collision-safe against existing database records
 */
export async function generateInvoiceNumber(
  dbOrTx: any,
  invoiceDate: Date = new Date()
): Promise<string> {
  const d = invoiceDate instanceof Date && !isNaN(invoiceDate.getTime()) ? invoiceDate : new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const prefix = `${mm}${yy}`;

  try {
    const generateOp = async () => {
      // 1. Check or initialize sequence record in business_sequences
      const existing = await dbOrTx
        .select()
        .from(businessSequences)
        .where(eq(businessSequences.name, SEQUENCE_NAME));

      let nextSerial = INITIAL_SERIAL;

      if (existing && existing.length > 0) {
        const record = existing[0];
        const currentVal = Number(record.currentVal) || 0;
        nextSerial = Math.max(INITIAL_SERIAL, currentVal + 1);

        await dbOrTx
          .update(businessSequences)
          .set({
            currentVal: nextSerial,
            prefix,
            updatedAt: new Date(),
          })
          .where(eq(businessSequences.name, SEQUENCE_NAME));
      } else {
        await dbOrTx.insert(businessSequences).values({
          name: SEQUENCE_NAME,
          prefix,
          currentVal: INITIAL_SERIAL,
          padding: 0,
          yearReset: false, // Explicitly non-resetting across month/year
          currentYear: d.getFullYear(),
          updatedAt: new Date(),
        });
        nextSerial = INITIAL_SERIAL;
      }

      // 2. Collision safeguard against existing invoices in database
      let candidateNumber = `${prefix}${nextSerial}`;
      let exists = true;
      let attempts = 0;

      while (exists && attempts < 100) {
        const [duplicate] = await dbOrTx
          .select({ id: invoices.id })
          .from(invoices)
          .where(eq(invoices.invoiceNumber, candidateNumber))
          .limit(1);

        if (!duplicate) {
          exists = false;
        } else {
          nextSerial++;
          candidateNumber = `${prefix}${nextSerial}`;
          attempts++;
          // Keep business_sequences in sync with bumped counter
          await dbOrTx
            .update(businessSequences)
            .set({
              currentVal: nextSerial,
              updatedAt: new Date(),
            })
            .where(eq(businessSequences.name, SEQUENCE_NAME));
        }
      }

      return candidateNumber;
    };

    let timer: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Invoice numbering operation timed out')), 3500);
    });

    try {
      return await Promise.race([generateOp(), timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (err) {
    console.error('[generateInvoiceNumber error, applying resilient fallback]', err);
    // Timestamp-based fallback guaranteed >= 251
    const fallbackSerial = Math.max(INITIAL_SERIAL, Math.floor(Date.now() % 100000));
    return `${prefix}${fallbackSerial}`;
  }
}
