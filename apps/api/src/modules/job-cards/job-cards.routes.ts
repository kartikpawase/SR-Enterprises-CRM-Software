import type { FastifyPluginAsync } from 'fastify';
import { jobCardsService } from './job-cards.service';
import {
  JobCardQueryFilterSchema,
  CreateJobCardSchema,
  AssignTechnicianSchema,
  UpdateJobCardWorkSchema,
  CompleteJobCardSchema,
  JobCardActionSchema,
} from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

export const jobCardsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/job-cards/kpis
   * High-level operational KPIs for Job Cards overview
   */
  fastify.get('/kpis', { preHandler: [requirePermission('services.view')] }, async (_request, reply) => {
    const kpis = await jobCardsService.getKPIs();
    return reply.send({
      success: true,
      data: kpis,
    });
  });

  /**
   * GET /api/v1/job-cards
   * List paginated job cards with filters
   */
  fastify.get('/', { preHandler: [requirePermission('services.view')] }, async (request, reply) => {
    const query = JobCardQueryFilterSchema.parse(request.query);
    const user = (request as any).user;

    // Role-based data isolation: If user is a field technician, only list their assigned jobs
    if (user?.role === 'Technician' && user?.id) {
      query.technicianId = user.id;
    }

    const result = await jobCardsService.getJobCards(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/job-cards/:id
   * Get single job card with full operational detail
   */
  fastify.get('/:id', { preHandler: [requirePermission('services.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const jobCard = await jobCardsService.getJobCardById(id, user);
    return reply.send({
      success: true,
      data: jobCard,
    });
  });

  /**
   * POST /api/v1/job-cards
   * Create a new Job Card for a service
   */
  fastify.post('/', { preHandler: [requirePermission('services.create')] }, async (request, reply) => {
    const body = CreateJobCardSchema.parse(request.body);
    const user = (request as any).user;
    const result = await jobCardsService.createJobCard(body, user?.id);
    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Job Card created successfully',
    });
  });

  /**
   * PATCH /api/v1/job-cards/:id
   * Update work execution details (diagnosis, parts used, charges, notes)
   */
  fastify.patch('/:id', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateJobCardWorkSchema.parse(request.body);
    const user = (request as any).user;
    const updated = await jobCardsService.updateWork(id, body, user);
    return reply.send({
      success: true,
      data: updated,
      message: 'Job Card work details updated',
    });
  });

  /**
   * POST /api/v1/job-cards/:id/assign
   * Assign or reassign technician
   */
  fastify.post('/:id/assign', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = AssignTechnicianSchema.parse(request.body);
    const user = (request as any).user;
    const assigned = await jobCardsService.assignTechnician(id, body, user?.id);
    return reply.send({
      success: true,
      data: assigned,
      message: 'Technician assigned successfully',
    });
  });

  /**
   * POST /api/v1/job-cards/:id/notify-technician
   * Manually trigger or retry WhatsApp notification to assigned technician
   */
  fastify.post('/:id/notify-technician', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const result = await jobCardsService.resendTechnicianNotification(id, user);
    return reply.send({
      success: result.success,
      data: result,
      message: result.success
        ? 'WhatsApp notification sent to technician'
        : (result.error || 'Failed to send WhatsApp notification'),
    });
  });

  /**
   * POST /api/v1/job-cards/:id/accept
   * Technician accepts assigned job card
   */
  fastify.post('/:id/accept', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const result = await jobCardsService.performWorkflowAction(id, { action: 'accept' }, user);
    return reply.send({
      success: true,
      data: result,
      message: 'Job Card accepted',
    });
  });

  /**
   * POST /api/v1/job-cards/:id/start
   * Start work execution on job card (sets startedAt and IN_PROGRESS)
   */
  fastify.post('/:id/start', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const result = await jobCardsService.performWorkflowAction(id, { action: 'start' }, user);
    return reply.send({
      success: true,
      data: result,
      message: 'Job started successfully',
    });
  });

  /**
   * POST /api/v1/job-cards/:id/hold
   * Put job card on hold with reason
   */
  fastify.post('/:id/hold', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = JobCardActionSchema.parse({ ...(request.body as any), action: 'hold' });
    const user = (request as any).user;
    const result = await jobCardsService.performWorkflowAction(id, body, user);
    return reply.send({
      success: true,
      data: result,
      message: 'Job Card placed on hold',
    });
  });

  /**
   * POST /api/v1/job-cards/:id/resume
   * Resume on-hold job card
   */
  fastify.post('/:id/resume', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const result = await jobCardsService.performWorkflowAction(id, { action: 'resume' }, user);
    return reply.send({
      success: true,
      data: result,
      message: 'Job resumed',
    });
  });

  /**
   * POST /api/v1/job-cards/:id/complete
   * Complete Job Card & finalize Service
   */
  fastify.post('/:id/complete', { preHandler: [requirePermission('services.complete')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CompleteJobCardSchema.parse(request.body);
    const user = (request as any).user;
    const result = await jobCardsService.completeJobCard(id, body, user);
    return reply.send({
      success: true,
      data: result,
      message: 'Job Card and Service completed successfully',
    });
  });

  /**
   * POST /api/v1/job-cards/:id/cancel
   * Cancel job card with audit reason
   */
  fastify.post('/:id/cancel', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = JobCardActionSchema.parse({ ...(request.body as any), action: 'cancel' });
    const user = (request as any).user;
    const result = await jobCardsService.performWorkflowAction(id, body, user);
    return reply.send({
      success: true,
      data: result,
      message: 'Job Card cancelled',
    });
  });

  /**
   * POST /api/v1/job-cards/:id/reopen
   * Reopen a completed/closed job card
   */
  fastify.post('/:id/reopen', { preHandler: [requirePermission('services.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = JobCardActionSchema.parse({ ...(request.body as any), action: 'reopen' });
    const user = (request as any).user;
    const result = await jobCardsService.performWorkflowAction(id, body, user);
    return reply.send({
      success: true,
      data: result,
      message: 'Job Card reopened',
    });
  });

  /**
   * GET /api/v1/job-cards/:id/charges
   * Get billable charges, parts, and warranty summary
   */
  fastify.get('/:id/charges', { preHandler: [requirePermission('services.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { serviceBillingService } = await import('../service-billing/service-billing.service');
    const summary = await serviceBillingService.getBillingSummary(id);
    return reply.send({
      success: true,
      data: summary,
    });
  });

  /**
   * POST /api/v1/job-cards/:id/invoice
   * Direct generation of service invoice from completed Job Card
   */
  fastify.post('/:id/invoice', { preHandler: [requirePermission('invoices.create')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { serviceBillingService } = await import('../service-billing/service-billing.service');
    const user = (request as any).user;
    const body = {
      ...(request.body as any),
      jobCardId: id,
    };
    const result = await serviceBillingService.generateServiceInvoice(
      body,
      user?.id,
      user?.fullName || user?.email || 'Staff'
    );
    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Service invoice generated successfully',
    });
  });

  /**
   * GET /api/v1/job-cards/:id/invoice
   * Get linked invoice for a Job Card
   */
  fastify.get('/:id/invoice', { preHandler: [requirePermission('services.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { serviceBillingService } = await import('../service-billing/service-billing.service');
    const summary = await serviceBillingService.getBillingSummary(id);
    return reply.send({
      success: true,
      data: summary.existingInvoice || null,
    });
  });
};
