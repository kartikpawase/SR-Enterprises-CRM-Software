import type { FastifyPluginAsync } from 'fastify';
import { salesService } from './sales.service';
import { invoicesService } from '../invoices/invoices.service';
import {
  CreateSaleSchema,
  UpdateSaleSchema,
  ConfirmSaleSchema,
  CancelSaleSchema,
  SaleQueryFilterSchema,
  CreateInvoiceFromSaleSchema,
} from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

export const salesRoutes: FastifyPluginAsync = async (fastify) => {
  // All sales endpoints require authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/sales
   * List paginated sales with search and status filters
   */
  fastify.get('/', { preHandler: [requirePermission('sales.view')] }, async (request, reply) => {
    const query = SaleQueryFilterSchema.parse(request.query);
    const result = await salesService.getSales(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/sales/stats
   * Get filtered KPI statistics, trends, and rankings
   */
  fastify.get('/stats', { preHandler: [requirePermission('sales.view')] }, async (request, reply) => {
    const query = SaleQueryFilterSchema.parse(request.query);
    const stats = await salesService.getSalesStats(query);
    return reply.send({
      success: true,
      data: stats,
    });
  });

  /**
   * GET /api/v1/sales/:id
   * Get single sale by ID with items, invoice, and asset linkages
   */
  fastify.get('/:id', { preHandler: [requirePermission('sales.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const sale = await salesService.getSaleById(id);
    return reply.send({
      success: true,
      data: sale,
    });
  });

  /**
   * POST /api/v1/sales
   * Create new Draft or Confirmed Sale
   */
  fastify.post('/', { preHandler: [requirePermission('sales.create')] }, async (request, reply) => {
    const body = CreateSaleSchema.parse(request.body);
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';

    const sale = await salesService.createSale(body, actorId, actorName);
    return reply.status(201).send({
      success: true,
      data: sale,
    });
  });

  /**
   * PATCH /api/v1/sales/:id
   * Update draft sale
   */
  fastify.patch('/:id', { preHandler: [requirePermission('sales.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateSaleSchema.parse(request.body);
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';

    const updated = await salesService.updateDraftSale(id, body, actorId, actorName);
    return reply.send({
      success: true,
      data: updated,
    });
  });

  /**
   * POST /api/v1/sales/:id/confirm
   * Atomically confirm sale and generate invoice, assets, and warranties
   */
  fastify.post('/:id/confirm', { preHandler: [requirePermission('sales.confirm')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = ConfirmSaleSchema.parse(request.body || {});
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';

    const confirmed = await salesService.confirmSale(id, body, actorId, actorName);
    return reply.send({
      success: true,
      data: confirmed,
    });
  });

  /**
   * POST /api/v1/sales/:id/cancel
   * Controlled cancellation preserving history
   */
  fastify.post('/:id/cancel', { preHandler: [requirePermission('sales.cancel')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = CancelSaleSchema.parse(request.body);
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';

    const cancelled = await salesService.cancelSale(id, reason || 'Cancelled by staff', actorId, actorName);
    return reply.send({
      success: true,
      data: cancelled,
    });
  });

  /**
   * POST /api/v1/sales/:id/invoice
   * Generate authoritative invoice from sale
   */
  fastify.post('/:id/invoice', { preHandler: [requirePermission('invoices.create')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CreateInvoiceFromSaleSchema.parse(request.body || {});
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';

    const invoice = await invoicesService.createFromSale(id, body, actorId, actorName);
    return reply.status(201).send({
      success: true,
      data: invoice,
    });
  });
  /**
   * DELETE /api/v1/sales/:id
   * Delete sale and associated items, invoices, and linkages
   */
  fastify.delete('/:id', { preHandler: [requirePermission('sales.cancel')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';

    const deleted = await salesService.deleteSale(id, actorId, actorName);
    return reply.send({
      success: true,
      data: deleted,
      message: 'Sale deleted successfully',
    });
  });
};

