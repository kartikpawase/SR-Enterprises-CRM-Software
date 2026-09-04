import type { FastifyPluginAsync } from 'fastify';
import { invoicesService } from './invoices.service';
import {
  InvoiceQueryFilterSchema,
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  FinalizeInvoiceSchema,
  CancelInvoiceSchema,
} from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

export const invoicesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/invoices
   * List paginated invoices with search, status filters, and totals
   */
  fastify.get('/', { preHandler: [requirePermission('invoices.view')] }, async (request, reply) => {
    const query = InvoiceQueryFilterSchema.parse(request.query);
    const result = await invoicesService.getInvoices(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/invoices/:id
   * Get single invoice with item snapshots, customer data, and payments
   */
  fastify.get('/:id', { preHandler: [requirePermission('invoices.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const invoice = await invoicesService.getInvoiceById(id);
    return reply.send({
      success: true,
      data: invoice,
    });
  });

  /**
   * POST /api/v1/invoices
   * Create direct invoice (DRAFT or ISSUED) with authoritative calculation
   */
  fastify.post('/', { preHandler: [requirePermission('invoices.create')] }, async (request, reply) => {
    const body = CreateInvoiceSchema.parse(request.body);
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';

    const invoice = await invoicesService.createInvoice(body, actorId, actorName);
    return reply.status(201).send({
      success: true,
      data: invoice,
    });
  });

  /**
   * PATCH /api/v1/invoices/:id
   * Update draft invoice only
   */
  fastify.patch('/:id', { preHandler: [requirePermission('invoices.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateInvoiceSchema.parse(request.body);
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';

    const updated = await invoicesService.updateDraftInvoice(id, body, actorId, actorName);
    return reply.send({
      success: true,
      data: updated,
    });
  });

  /**
   * POST /api/v1/invoices/:id/finalize
   * Finalize draft invoice (DRAFT -> ISSUED)
   */
  fastify.post('/:id/finalize', { preHandler: [requirePermission('invoices.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = FinalizeInvoiceSchema.parse(request.body || {});
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';

    const finalized = await invoicesService.finalizeInvoice(id, body.notes, actorId, actorName);
    return reply.send({
      success: true,
      data: finalized,
    });
  });

  /**
   * POST /api/v1/invoices/:id/cancel
   * Cancel an issued invoice
   */
  fastify.post('/:id/cancel', { preHandler: [requirePermission('invoices.cancel')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason, cancellationReason } = CancelInvoiceSchema.parse(request.body || {});
    const cancelText = reason || cancellationReason || 'Cancelled by staff';
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';

    const cancelled = await invoicesService.cancelInvoice(id, cancelText, actorId, actorName);
    return reply.send({
      success: true,
      data: cancelled,
    });
  });

  /**
   * GET /api/v1/invoices/:id/payments
   * List all payments recorded for an invoice
   */
  fastify.get('/:id/payments', { preHandler: [requirePermission('invoices.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payments = await invoicesService.getInvoicePayments(id);
    return reply.send({
      success: true,
      data: payments,
    });
  });

  /**
   * GET /api/v1/invoices/:id/balance
   * Authoritative balance breakdown for an invoice
   */
  fastify.get('/:id/balance', { preHandler: [requirePermission('invoices.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const balance = await invoicesService.getInvoiceBalance(id);
    return reply.send({
      success: true,
      data: balance,
    });
  });

  /**
   * POST /api/v1/invoices/:id/send-due-mail
   * Send automated payment due reminder email using PHPMailer
   */
  fastify.post('/:id/send-due-mail', { preHandler: [requirePermission('invoices.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await invoicesService.sendPaymentDueMail(id);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'EMAIL_DISPATCH_FAILED',
          message: result.message || 'Payment reminder email could not be sent.',
        },
        data: result,
        message: result.message,
      });
    }
    return reply.status(200).send({
      success: true,
      data: result,
      message: result.message,
    });
  });

  /**
   * POST /api/v1/invoices/send-due-mails
   * Batch trigger automated payment due reminder emails using PHPMailer
   */
  fastify.post('/send-due-mails', { preHandler: [requirePermission('invoices.view')] }, async (request, reply) => {
    const result = await invoicesService.sendAllPaymentDueMails();
    return reply.send({
      success: true,
      data: result,
    });
  });
};
