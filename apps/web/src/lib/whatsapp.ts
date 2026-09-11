/**
 * Utility to generate and trigger direct WhatsApp Web / Mobile chat with customers
 */
export interface SendInvoiceWhatsAppParams {
  phone?: string | null;
  orderNumber?: string;
  invoiceNumber?: string;
  invoiceId?: string;
  customerName?: string;
  totalAmount?: string | number | null;
  paidAmount?: string | number | null;
  balanceAmount?: string | number | null;
  publicUrl?: string;
}

export function sendInvoiceViaWhatsApp({
  phone,
  orderNumber,
  invoiceNumber,
  invoiceId,
  customerName,
  totalAmount,
  balanceAmount,
  publicUrl,
}: SendInvoiceWhatsAppParams): { success: boolean; url?: string; error?: string } {
  if (!phone || !phone.trim()) {
    return { success: false, error: 'Customer phone number is missing.' };
  }

  // Remove non-digit characters
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const orderId = orderNumber || invoiceNumber || 'Order';
  const invNumber = invoiceNumber || orderNumber || 'Invoice';
  const invoiceKey = invoiceId || invoiceNumber || orderNumber || '';

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const viewUrl = publicUrl || (origin && invoiceKey ? `${origin}/invoice/view/${encodeURIComponent(invoiceKey)}` : '');

  let message = customerName
    ? `Dear ${customerName},\nThanks for choosing SR Enterprises. Here is your invoice for order ${orderId},\nInvoice No: ${invNumber}`
    : `Thanks for shopping with SR Enterprises. Here is your invoice for your order ${orderId},\nInvoice No: ${invNumber}`;

  if (totalAmount && Number(totalAmount) > 0) {
    message += `\nTotal Amount: ₹ ${Number(totalAmount).toLocaleString('en-IN')}`;
  }

  if (balanceAmount && Number(balanceAmount) > 0) {
    message += `\nBalance Due: ₹ ${Number(balanceAmount).toLocaleString('en-IN')}`;
  }

  if (viewUrl) {
    message += `\n\nView and download your official invoice online:\n${viewUrl}`;
  }

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return { success: true, url };
}
