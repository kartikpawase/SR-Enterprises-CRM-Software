import { describe, it, expect } from 'vitest';
import { generateInvoiceNumber } from './invoices.numbering';

describe('Invoice Numbering Generation Logic (MMYY + running serial from 251)', () => {
  it('TEST 8: Generates initial serial 251 with MMYY prefix and increments sequentially without resetting across months/years', async () => {
    let storedVal: number | null = null;
    const existingInvoices = new Set<string>();

    // Mock dbOrTx that acts on our local store
    const mockDbOrTx = {
      select: (fields?: any) => ({
        from: (table: any) => ({
          where: (condition: any) => {
            // Check if querying businessSequences
            if (fields === undefined) {
              if (storedVal === null) return Promise.resolve([]);
              return Promise.resolve([{ currentVal: storedVal }]);
            }
            // Check if querying invoices (duplicate check)
            return {
              limit: () => {
                return Promise.resolve([]);
              },
            };
          },
        }),
      }),
      insert: (table: any) => ({
        values: (vals: any) => {
          storedVal = vals.currentVal;
          return Promise.resolve();
        },
      }),
      update: (table: any) => ({
        set: (vals: any) => ({
          where: () => {
            storedVal = vals.currentVal;
            return Promise.resolve();
          },
        }),
      }),
    };

    // 1. First invoice in September 2026 -> 0926251
    const inv1 = await generateInvoiceNumber(mockDbOrTx, new Date('2026-09-05T10:00:00.000Z'));
    expect(inv1).toBe('0926251');

    // 2. Second invoice in September 2026 -> 0926252
    const inv2 = await generateInvoiceNumber(mockDbOrTx, new Date('2026-09-06T11:00:00.000Z'));
    expect(inv2).toBe('0926252');

    // 3. Third invoice in October 2026 -> 1026253 (counter does NOT reset)
    const inv3 = await generateInvoiceNumber(mockDbOrTx, new Date('2026-10-01T09:00:00.000Z'));
    expect(inv3).toBe('1026253');

    // 4. Fourth invoice in January 2027 -> 0127254 (counter does NOT reset across years)
    const inv4 = await generateInvoiceNumber(mockDbOrTx, new Date('2027-01-15T14:30:00.000Z'));
    expect(inv4).toBe('0127254');
  });
});
