import type { FastifyPluginAsync } from 'fastify';
import { servicesService } from './services.service';
import {
  ServiceQueryFilterSchema,
  CreateServiceSchema,
  UpdateServiceSchema,
  CompleteServiceSchema,
} from '@crm/validation';
import { z } from 'zod';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

const HeatmapQuerySchema = z.object({
  period: z.enum(['year', 'month', 'week', 'day']).default('month'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const CancelServiceSchema = z.object({
  cancelReason: z.string().min(3, 'Cancel reason must be at least 3 characters'),
});

export const servicesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/services/kpis
   * Operational KPIs for Services Overview
   */
  fastify.get('/kpis', { preHandler: [requirePermission('services.view')] }, async (_request, reply) => {
    const kpis = await servicesService.getKPIs();
    return reply.send({
      success: true,
      data: kpis,
    });
  });

  /**
   * GET /api/v1/services/heatmap
   * Heatmap square cell activity grid aggregation
   */
  fastify.get('/heatmap', { preHandler: [requirePermission('services.view')] }, async (request, reply) => {
    const query = HeatmapQuerySchema.parse(request.query);
    const heatmap = await servicesService.getHeatmap(query.period, query.dateFrom, query.dateTo);
    return reply.send({
      success: true,
      data: heatmap,
    });
  });

  /**
   * GET /api/v1/services/upcoming
   * Get upcoming scheduled services for reminders and scheduling
   */
  fastify.get('/upcoming', { preHandler: [requirePermission('services.view')] }, async (request, reply) => {
    const { days } = request.query as { days?: string };
    const result = await servicesService.getUpcomingServices(days ? Number(days) : 7);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/services/overdue
   * Get overdue uncompleted services
   */
  fastify.get('/overdue', { preHandler: [requirePermission('services.view')] }, async (_request, reply) => {
    const result = await servicesService.getOverdueServices();
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/services/technicians
   * Active Technicians dropdown list
   */
  fastify.get('/technicians', { preHandler: [requirePermission('services.view')] }, async (_request, reply) => {
    const techs = await servicesService.listTechnicians();
    return reply.send({
      success: true,
      data: techs,
    });
  });

  /**
   * GET /api/v1/services
   * List paginated services with multi-criteria filters
   */
  fastify.get('/', { preHandler: [requirePermission('services.view')] }, async (request, reply) => {
    const query = ServiceQueryFilterSchema.parse(request.query);
    const result = await servicesService.getServices(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/services/:id
   * Get single service detail with customer, machine, and job card
   */
  fastify.get('/:id', { preHandler: [requirePermission('services.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const service = await servicesService.getServiceById(id);
    return reply.send({
      success: true,
      data: service,
    });
  });

  /**
   * POST /api/v1/services
   * Schedule a new Service (Generates SRV-YYYY-XXXX & Job Card JC-YYYY-XXXX)
   */
  fastify.post('/', { preHandler: [requirePermission('services.create')] }, async (request, reply) => {
    const body = CreateServiceSchema.parse(request.body);
    const user = (request as any).user;
    const result = await servicesService.createService(body, user?.userId || user?.id);
    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Service scheduled successfully',
    });
  });

  /**
   * PATCH /api/v1/services/:id
   * Update service (reschedule, notes, technician assignment)
   */
  fastify.patch('/:id', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateServiceSchema.parse(request.body);
    const user = (request as any).user;
    const updated = await servicesService.updateService(id, body, user?.id);
    return reply.send({
      success: true,
      data: updated,
      message: 'Service updated successfully',
    });
  });

  /**
   * POST /api/v1/services/:id/cancel
   * Cancel service with reason
   */
  fastify.post('/:id/cancel', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cancelReason } = CancelServiceSchema.parse(request.body);
    const user = (request as any).user;
    const cancelled = await servicesService.cancelService(id, cancelReason, user?.id);
    return reply.send({
      success: true,
      data: cancelled,
      message: 'Service cancelled successfully',
    });
  });

  /**
   * DELETE /api/v1/services/:id
   * Delete service and associated job card and schedule at DB and memory level
   */
  fastify.delete('/:id', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const deleted = await servicesService.deleteService(id, user?.id);
    return reply.send({
      success: true,
      data: deleted,
      message: 'Service deleted successfully',
    });
  });

  /**
   * POST /api/v1/services/:id/notify-technician
   * Manually trigger or retry WhatsApp notification to assigned technician
   */
  fastify.post('/:id/notify-technician', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const actorId = user?.userId || user?.id;
    const result = await servicesService.resendTechnicianNotification(id, actorId);
    return reply.send({
      success: result.success,
      data: result,
      message: result.success
        ? 'WhatsApp notification sent to technician'
        : (result.error || 'Failed to send WhatsApp notification'),
    });
  });

  /**
   * POST /api/v1/services/:id/notify-customer
   * Manually trigger or open WhatsApp service visit notification to client
   */
  fastify.post('/:id/notify-customer', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const actorId = user?.userId || user?.id;
    const result = await servicesService.resendCustomerNotification(id, actorId);
    return reply.send({
      success: result.success,
      data: result,
      message: result.success
        ? 'WhatsApp notification sent to customer'
        : (result.error || 'Failed to send WhatsApp notification'),
    });
  });

  /**
   * POST /api/v1/services/:id/complete
   * Complete Service & save Job Card diagnostic details + replaced parts
   */
  fastify.post('/:id/complete', { preHandler: [requirePermission('services.complete')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = CompleteServiceSchema.parse(request.body);
      const user = (request as any).user;
      const result = await servicesService.completeService(id, body, user?.userId || user?.id);
      return reply.send({
        success: true,
        data: result,
        message: 'Service completed successfully',
      });
    } catch (err: any) {
      if (err?.statusCode === 404) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: err.message || 'Service record not found',
          },
        });
      }
      throw err;
    }
  });
};
