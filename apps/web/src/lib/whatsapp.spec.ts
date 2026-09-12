import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendInvoiceViaWhatsApp } from './whatsapp';

describe('WhatsApp Invoice Sharing Utility', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });

  it('rejects sharing when customer phone number is missing', () => {
    const res = sendInvoiceViaWhatsApp({
      phone: '',
      orderNumber: 'ORD-001',
      invoiceNumber: 'INV-2026-0001',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Customer phone number is missing.');
  });

  it('always starts greeting with "Hello Customer" and does not include personalized customer name (Customer 1: Rahul Sharma)', () => {
    const res = sendInvoiceViaWhatsApp({
      phone: '9876543210',
      orderNumber: 'SO-001',
      invoiceNumber: 'INV-2026-0001',
      invoiceId: 'inv-uuid-1234',
      customerName: 'Rahul Sharma',
      totalAmount: 18500,
      balanceAmount: 5000,
      companyName: 'SR Enterprises',
    });

    expect(res.success).toBe(true);
    expect(res.url).toBeDefined();
    expect(res.url).toContain('wa.me/919876543210');

    const decoded = decodeURIComponent(res.url || '');
    expect(decoded.startsWith('https://wa.me/919876543210?text=Hello Customer')).toBe(true);
    expect(decoded).toContain('Hello Customer,');
    expect(decoded).not.toContain('Rahul Sharma');
    expect(decoded).not.toContain('Rahul');
    expect(decoded).toContain('Thanks for choosing SR Enterprises.');
    expect(decoded).toContain('Here is your invoice for order SO-001,');
    expect(decoded).toContain('Invoice No: INV-2026-0001');
    expect(decoded).toContain('Total Amount: ₹ 18,500');
    expect(decoded).toContain('Balance Due: ₹ 5,000');
    expect(decoded).toContain('/invoice/view/inv-uuid-1234');
  });

  it('always starts greeting with "Hello Customer" and does not include personalized customer name (Customer 2: Priya Patil)', () => {
    const res = sendInvoiceViaWhatsApp({
      phone: '+91 98200 11223',
      orderNumber: 'SO-002',
      invoiceNumber: 'INV-2026-0002',
      invoiceId: 'inv-uuid-5678',
      customerName: 'Priya Patil',
      totalAmount: 24000,
      balanceAmount: 0,
      companyName: 'SR Enterprises',
    });

    expect(res.success).toBe(true);
    expect(res.url).toBeDefined();
    expect(res.url).toContain('wa.me/919820011223');

    const decoded = decodeURIComponent(res.url || '');
    expect(decoded.startsWith('https://wa.me/919820011223?text=Hello Customer')).toBe(true);
    expect(decoded).toContain('Hello Customer,');
    expect(decoded).not.toContain('Priya Patil');
    expect(decoded).not.toContain('Priya');
    expect(decoded).toContain('Thanks for choosing SR Enterprises.');
    expect(decoded).toContain('Here is your invoice for order SO-002,');
    expect(decoded).toContain('Invoice No: INV-2026-0002');
    expect(decoded).toContain('Total Amount: ₹ 24,000');
    expect(decoded).toContain('/invoice/view/inv-uuid-5678');
  });

  it('uses custom publicUrl if provided and maintains Hello Customer greeting', () => {
    const res = sendInvoiceViaWhatsApp({
      phone: '+91 98765 43210',
      orderNumber: 'SO-003',
      invoiceNumber: 'INV-2026-0003',
      customerName: 'Amit Sharma',
      publicUrl: 'https://crm.srenterprises.com/invoice/view/INV-2026-0003',
    });

    expect(res.success).toBe(true);
    const decoded = decodeURIComponent(res.url || '');
    expect(decoded).toContain('Hello Customer,');
    expect(decoded).not.toContain('Amit Sharma');
    expect(decoded).toContain('https://crm.srenterprises.com/invoice/view/INV-2026-0003');
  });
});
