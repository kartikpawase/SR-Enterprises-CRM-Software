import { describe, it, expect } from 'vitest';
import { CreateInvoiceSchema, UpdateInvoiceSchema } from '@crm/validation';

describe('Invoice Validation Schemas (Max 10 rows, Due Date >= Invoice Date, PO Number)', () => {
  const validCustomerId = '11111111-1111-1111-1111-111111111111';

  it('TEST 1: Validates a standard invoice with 1 row, valid due date, no PO, no notes', () => {
    const validData = {
      customerId: validCustomerId,
      invoiceDate: '2026-09-05T00:00:00.000Z',
      dueDate: '2026-09-10T00:00:00.000Z',
      items: [
        {
          name: '25LPH RO Plant',
          description: '25LPH RO Plant',
          quantity: 1,
          unitPrice: 15000,
        },
      ],
    };

    const parsed = CreateInvoiceSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('TEST 2: Accepts optional PO Number in Create and Update schemas', () => {
    const withPo = {
      customerId: validCustomerId,
      invoiceDate: '2026-09-05T00:00:00.000Z',
      dueDate: '2026-09-10T00:00:00.000Z',
      poNumber: 'PO-SR-2026-001',
      items: [
        {
          name: 'Item 1',
          description: 'Item 1',
          quantity: 1,
          unitPrice: 1000,
        },
      ],
    };

    const parsedCreate = CreateInvoiceSchema.safeParse(withPo);
    expect(parsedCreate.success).toBe(true);
    if (parsedCreate.success) {
      expect(parsedCreate.data.poNumber).toBe('PO-SR-2026-001');
    }

    const parsedUpdate = UpdateInvoiceSchema.safeParse({ poNumber: 'PO-UPDATED-99' });
    expect(parsedUpdate.success).toBe(true);
    if (parsedUpdate.success) {
      expect(parsedUpdate.data.poNumber).toBe('PO-UPDATED-99');
    }
  });

  it('TEST 4: Accepts up to exactly 10 items in CreateInvoiceSchema', () => {
    const items10 = Array.from({ length: 10 }, (_, i) => ({
      name: `Item ${i + 1}`,
      description: `Item ${i + 1}`,
      quantity: 1,
      unitPrice: 100 * (i + 1),
    }));

    const parsed = CreateInvoiceSchema.safeParse({
      customerId: validCustomerId,
      invoiceDate: '2026-09-05T00:00:00.000Z',
      dueDate: '2026-09-15T00:00:00.000Z',
      items: items10,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items.length).toBe(10);
    }
  });

  it('TEST 5: Rejects an 11th item in CreateInvoiceSchema and UpdateInvoiceSchema', () => {
    const items11 = Array.from({ length: 11 }, (_, i) => ({
      name: `Item ${i + 1}`,
      description: `Item ${i + 1}`,
      quantity: 1,
      unitPrice: 100,
    }));

    const parsedCreate = CreateInvoiceSchema.safeParse({
      customerId: validCustomerId,
      invoiceDate: '2026-09-05T00:00:00.000Z',
      dueDate: '2026-09-15T00:00:00.000Z',
      items: items11,
    });

    expect(parsedCreate.success).toBe(false);
    if (!parsedCreate.success) {
      expect(parsedCreate.error.issues.some((iss) => iss.message.includes('10 items'))).toBe(true);
    }

    const parsedUpdate = UpdateInvoiceSchema.safeParse({
      items: items11,
    });

    expect(parsedUpdate.success).toBe(false);
    if (!parsedUpdate.success) {
      expect(parsedUpdate.error.issues.some((iss) => iss.message.includes('10 items'))).toBe(true);
    }
  });

  it('TEST 6: Rejects Due Date earlier than Invoice Date in CreateInvoiceSchema and UpdateInvoiceSchema', () => {
    const invalidDates = {
      customerId: validCustomerId,
      invoiceDate: '2026-09-15T00:00:00.000Z',
      dueDate: '2026-09-05T00:00:00.000Z', // 10 days earlier!
      items: [
        {
          name: 'Item 1',
          description: 'Item 1',
          quantity: 1,
          unitPrice: 1000,
        },
      ],
    };

    const parsedCreate = CreateInvoiceSchema.safeParse(invalidDates);
    expect(parsedCreate.success).toBe(false);
    if (!parsedCreate.success) {
      expect(
        parsedCreate.error.issues.some((iss) =>
          iss.message.toLowerCase().includes('due date cannot be before invoice date')
        )
      ).toBe(true);
    }

    const parsedUpdate = UpdateInvoiceSchema.safeParse({
      invoiceDate: '2026-09-20T00:00:00.000Z',
      dueDate: '2026-09-10T00:00:00.000Z',
    });

    expect(parsedUpdate.success).toBe(false);
    if (!parsedUpdate.success) {
      expect(
        parsedUpdate.error.issues.some((iss) =>
          iss.message.toLowerCase().includes('due date cannot be before invoice date')
        )
      ).toBe(true);
    }
  });
});
