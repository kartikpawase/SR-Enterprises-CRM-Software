import { invoicesRepository } from './invoices.repository';
import { paymentsRepository } from '../payments/payments.repository';
import type {
  CreateInvoiceInput,
  CreateInvoiceFromSaleInput,
  UpdateInvoiceInput,
  InvoiceQueryFilter,
} from '@crm/validation';

export class InvoicesService {
  async getInvoices(filters: InvoiceQueryFilter) {
    return invoicesRepository.findPaginated(filters);
  }

  async getInvoiceById(id: string) {
    const invoice = await invoicesRepository.findById(id);
    if (!invoice) {
      const err: any = new Error('Invoice not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return invoice;
  }

  async createInvoice(data: CreateInvoiceInput, actorId?: string, actorName = 'System') {
    return invoicesRepository.createInvoice(data, actorId, actorName);
  }

  async createFromSale(saleId: string, options: CreateInvoiceFromSaleInput = {}, actorId?: string, actorName = 'System') {
    return invoicesRepository.createFromSale(saleId, options, actorId, actorName);
  }

  async updateDraftInvoice(id: string, data: UpdateInvoiceInput, actorId?: string, actorName = 'System') {
    return invoicesRepository.updateDraft(id, data, actorId, actorName);
  }

  async finalizeInvoice(id: string, notes?: string | null, actorId?: string, actorName = 'System') {
    return invoicesRepository.finalize(id, notes, actorId, actorName);
  }

  async cancelInvoice(id: string, reason: string, actorId?: string, actorName = 'System') {
    return invoicesRepository.cancel(id, reason, actorId, actorName);
  }

  async getInvoicePayments(invoiceId: string) {
    return paymentsRepository.getPaymentsByInvoice(invoiceId);
  }

  async getInvoiceBalance(invoiceId: string) {
    return paymentsRepository.getInvoiceBalance(invoiceId);
  }

  /**
   * Send automated payment due reminder email using PHPMailer & centralized EmailService
   */
  async sendPaymentDueMail(invoiceId: string) {
    const { emailService } = await import('../notifications/email.service');
    const result = await emailService.sendPaymentPendingReminder(invoiceId);

    if (!result) {
      try {
        const invoice = await this.getInvoiceById(invoiceId);
        const balance = await this.getInvoiceBalance(invoiceId);
        const dueAmount = parseFloat(balance.outstandingAmount);
        if (dueAmount <= 0.01) {
          return {
            success: false,
            message: `Invoice #${invoice.invoiceNumber} is already fully paid. No balance due.`,
          };
        }
        return {
          success: false,
          message: `Invoice #${invoice.invoiceNumber} is not eligible for reminder or customer is missing email.`,
        };
      } catch {
        return {
          success: false,
          message: `Invoice record '${invoiceId}' could not be found.`,
        };
      }
    }

    if (!result.success) {
      let invNum = '';
      try {
        const invoice = await this.getInvoiceById(invoiceId);
        if (invoice?.invoiceNumber) invNum = ` for invoice #${invoice.invoiceNumber}`;
      } catch {}

      return {
        success: false,
        status: result.status || 'FAILED',
        notificationId: result.notificationId,
        message: result.error || result.reason || `Email could not be sent${invNum}. Please verify customer email and SMTP configuration.`,
      };
    }

    return {
      success: true,
      status: result.status,
      notificationId: result.notificationId,
      message: result.message || 'Payment reminder email sent successfully via PHPMailer.',
    };
  }

  /**
   * Scan and send automatic payment due reminder emails to all eligible customers
   */
  async sendAllPaymentDueMails() {
    const list = await invoicesRepository.findPaginated({ page: 1, limit: 500 });
    const eligible = (list.data || []).filter((inv: any) =>
      ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status)
    );

    const { emailService } = await import('../notifications/email.service');
    const results: any[] = [];
    for (const inv of eligible) {
      try {
        const res = await emailService.sendPaymentPendingReminder(inv.id);
        if (res) {
          results.push({ invoiceNumber: inv.invoiceNumber, result: res });
        }
      } catch (e: any) {
        results.push({ invoiceNumber: inv.invoiceNumber, error: e.message });
      }
    }

    return {
      processedCount: eligible.length,
      sentCount: results.filter((r) => r.result?.status === 'PENDING' || r.result?.status === 'SENT').length,
      details: results,
    };
  }
}

export const invoicesService = new InvoicesService();

