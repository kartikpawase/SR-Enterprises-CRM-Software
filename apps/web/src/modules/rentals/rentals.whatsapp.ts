import type { RentalItem } from './rentals.api';
import { formatINR, formatDate } from '../../lib/formatters';

export interface SendRentalWhatsAppResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Normalizes a phone number for WhatsApp Web/Mobile chat
 */
export function normalizeWhatsAppPhone(phone?: string | null): string | null {
  if (!phone || !phone.trim()) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Formats a date for human-readable WhatsApp communication (e.g. 05 Sep 2026)
 */
export function formatWhatsAppDate(dateValue: string | Date | undefined): string {
  if (!dateValue) return 'Due Date';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateValue);
  }
}

/**
 * Builds dynamic WhatsApp payment reminder message based on rental status,
 * outstanding amount, and due date.
 */
export function buildRentalWhatsAppMessage(rental: RentalItem, overridePhone?: string): string {
  const customerName = rental.customer?.fullName?.trim() || 'Valued Customer';
  const machineModel = rental.machineModel?.trim() || 'RO Purifier';
  const rentalId = rental.rentalNumber?.trim() || 'Rental';
  const monthlyRentFormatted = formatINR(Number(rental.monthlyRent || 0));
  const dueDateFormatted = formatWhatsAppDate(rental.nextDueDate);
  const totalPaidFormatted = formatINR(Number(rental.totalPaid || 0));
  const outstandingAmountNum = Number(rental.outstandingAmount || 0);
  const outstandingFormatted = outstandingAmountNum > 0
    ? formatINR(outstandingAmountNum)
    : monthlyRentFormatted;

  const isOverdue = rental.rentalStatus === 'OVERDUE' || rental.paymentStatus === 'OVERDUE';
  const isPartiallyPaid = rental.paymentStatus === 'PARTIALLY_PAID' || (outstandingAmountNum > 0 && rental.paymentStatus !== 'PAID');

  if (isOverdue) {
    return `Hello ${customerName},

Your RO rental payment is currently overdue.

Machine: ${machineModel}
Rental ID: ${rentalId}
Rent Amount: ${monthlyRentFormatted}
Due Date: ${dueDateFormatted}
Outstanding Amount: ${outstandingFormatted}
Status: OVERDUE

Kindly make the payment at the earliest.

Thank you,
SR ENTERPRISES`;
  }

  if (isPartiallyPaid) {
    return `Hello ${customerName},

This is a rent payment reminder from SR ENTERPRISES.

Rental Details:
Machine: ${machineModel}
Rental ID: ${rentalId}
Monthly Rent: ${monthlyRentFormatted}
Amount Paid: ${totalPaidFormatted}
Balance Due: ${outstandingFormatted}
Next Due Date: ${dueDateFormatted}
Current Status: Partially Paid

Kindly make the payment by the due date.

Thank you,
SR ENTERPRISES`;
  }

  // Standard upcoming / payment due reminder
  const paymentStatusDisplay = rental.paymentStatus === 'PAID'
    ? 'Active / Paid'
    : (rental.paymentStatus === 'DUE' ? 'Payment Due' : 'Pending Payment');

  return `Dear Customer,

This is a reminder from SR ENTERPRISES regarding your upcoming RO rental payment.

Rental Details:
Machine: ${machineModel}
Rental ID: ${rentalId}
Rent Amount: ${monthlyRentFormatted}
Next Due Date: ${dueDateFormatted}
Amount Due: ${outstandingFormatted}
Current Status: ${paymentStatusDisplay}

Kindly make the payment by the due date.

Thank you,
SR ENTERPRISES`;
}

/**
 * Triggers WhatsApp Web/App reminder for a specific rental
 */
export function sendRentalWhatsAppReminder(
  rental: RentalItem,
  overridePhone?: string
): SendRentalWhatsAppResult {
  const phoneToUse =
    overridePhone ||
    rental.customer?.phone ||
    (rental as any).phone ||
    (rental as any).customerPhone ||
    (rental as any).mobile;
  const normalizedPhone = normalizeWhatsAppPhone(phoneToUse);

  if (!normalizedPhone) {
    return {
      success: false,
      error: 'Customer phone number is not available. Please ensure the customer has a mobile number registered.',
    };
  }

  const message = buildRentalWhatsAppMessage(rental, overridePhone);
  const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  return {
    success: true,
    url: whatsappUrl,
  };
}
