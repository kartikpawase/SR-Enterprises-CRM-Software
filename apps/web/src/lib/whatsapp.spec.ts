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

  it('generates WhatsApp message with public invoice viewing URL and normalizes 10-digit Indian phone', () => {
    const res = sendInvoiceViaWhatsApp({
      phone: '9876543210',
      orderNumber: 'SO-001',
      invoiceNumber: 'INV-2026-0001',
      invoiceId: 'inv-uuid-1234',
      customerName: 'Suresh Patil',
      totalAmount: 18500,
      balanceAmount: 5000,
    });

    expect(res.success).toBe(true);
    expect(res.url).toBeDefined();
    expect(res.url).toContain('wa.me/919876543210');

    const decoded = decodeURIComponent(res.url || '');
    expect(decoded).toContain('Dear Suresh Patil');
    expect(decoded).toContain('Invoice No: INV-2026-0001');
    expect(decoded).toContain('Total Amount: ₹ 18,500');
    expect(decoded).toContain('Balance Due: ₹ 5,000');
    expect(decoded).toContain('/invoice/view/inv-uuid-1234');
  });

  it('uses custom publicUrl if provided', () => {
    const res = sendInvoiceViaWhatsApp({
      phone: '+91 98765 43210',
      orderNumber: 'SO-002',
      invoiceNumber: 'INV-2026-0002',
      publicUrl: 'https://crm.srenterprises.com/invoice/view/INV-2026-0002',
    });

    expect(res.success).toBe(true);
    const decoded = decodeURIComponent(res.url || '');
    expect(decoded).toContain('https://crm.srenterprises.com/invoice/view/INV-2026-0002');
  });
});
