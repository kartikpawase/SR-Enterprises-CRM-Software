import type { FastifyPluginAsync } from 'fastify';
import { customerService } from './customer.service';
import { assetsService } from '../assets/assets.service';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  UpdateCustomerLabelSchema,
  CustomerQueryFilterSchema,
  CheckDuplicateCustomerSchema,
  CustomerNoteSchema,
  ArchiveCustomerSchema,
  CreateAssetSchema,
  UuidParamSchema,
  PaginationQuerySchema,
} from '@crm/validation';
import { HTTP_STATUS } from '@crm/shared';

export const customerRoutes: FastifyPluginAsync = async (fastify) => {
  // All customer endpoints require authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/customers
   * Search, filter, and paginate customers directory
   */
  fastify.get(
    '/',
    { preHandler: [requirePermission('customers.view')] },
    async (request, reply) => {
      const filters = CustomerQueryFilterSchema.parse(request.query);
      const result = await customerService.getCustomers(filters);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    }
  );

  /**
   * GET /api/v1/customers/stats
   * Aggregated customer statistics & dashboard metrics
   */
  fastify.get(
    '/stats',
    { preHandler: [requirePermission('customers.view')] },
    async (_request, reply) => {
      const stats = await customerService.getCustomerDashboardStats();
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: stats,
      });
    }
  );

  /**
   * GET /api/v1/customers/check-duplicate
   * Check for duplicate phone or email before form submission
   */
  fastify.get(
    '/check-duplicate',
    { preHandler: [requirePermission('customers.view')] },
    async (request, reply) => {
      const input = CheckDuplicateCustomerSchema.parse(request.query);
      const result = await customerService.checkDuplicate(input);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * POST /api/v1/customers
   * Create a new customer atomically
   */
  fastify.post(
    '/',
    { preHandler: [requirePermission('customers.create')] },
    async (request, reply) => {
      const body = CreateCustomerSchema.parse(request.body);
      const actorId = request.user?.userId;
      const actorName = request.user?.displayName;

      const customer = await customerService.createCustomer(body, actorId, actorName);
      if (!customer || !customer.id) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          success: false,
          error: {
            code: 'CUSTOMER_CREATE_FAILED',
            message: 'Failed to create customer in database',
          },
        });
      }

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: customer,
      });
    }
  );

  /**
   * GET /api/v1/customers/:id
   * Get single customer profile overview & addresses
   */
  fastify.get(
    '/:id',
    { preHandler: [requirePermission('customers.view')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const customer = await customerService.getCustomerById(id);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: customer,
      });
    }
  );

  /**
   * PATCH /api/v1/customers/:id
   * Update customer profile & addresses
   */
  fastify.patch(
    '/:id',
    { preHandler: [requirePermission('customers.update')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const body = UpdateCustomerSchema.parse(request.body);
      const actorId = request.user?.userId;
      const actorName = request.user?.displayName;

      const updated = await customerService.updateCustomer(id, body, actorId, actorName);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: updated,
      });
    }
  );

  /**
   * PATCH /api/v1/customers/:id/label
   * Update customer classification label (GOOD, BAD, NONE/null)
   */
  fastify.patch(
    '/:id/label',
    { preHandler: [requirePermission('customers.update')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const body = UpdateCustomerLabelSchema.parse(request.body);
      const actorId = request.user?.userId;
      const actorName = request.user?.displayName;

      const updated = await customerService.updateCustomer(
        id,
        { customerLabel: body.label } as any,
        actorId,
        actorName
      );

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: updated,
      });
    }
  );

  /**
   * POST /api/v1/customers/:id/archive
   * Soft-archive customer account
   */
  fastify.post(
    '/:id/archive',
    { preHandler: [requirePermission('customers.archive')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const body = ArchiveCustomerSchema.parse(request.body || {});
      const actorId = request.user?.userId;
      const actorName = request.user?.displayName;

      const archived = await customerService.archiveCustomer(id, body.reason, actorId, actorName);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: archived,
      });
    }
  );

  /**
   * DELETE /api/v1/customers/:id
   * RESTful Soft-delete / archive endpoint
   */
  fastify.delete(
    '/:id',
    { preHandler: [requirePermission('customers.delete')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const actorId = request.user?.userId;
      const actorName = request.user?.displayName;

      const deleted = await customerService.deleteCustomerCompletely(id, actorId, actorName);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: deleted,
      });
    }
  );

  /**
   * GET /api/v1/customers/:id/financial-summary
   * Authoritative financial summary (requires invoices.view or payments.view)
   */
  fastify.get(
    '/:id/financial-summary',
    { preHandler: [requirePermission('invoices.view')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const summary = await customerService.getFinancialSummary(id);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: summary,
      });
    }
  );

  /**
   * GET /api/v1/customers/:id/assets
   * Customer assets (RO machines, spare parts, serial numbers, warranties)
   */
  fastify.get(
    '/:id/assets',
    { preHandler: [requirePermission('customers.view')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const assets = await customerService.getCustomerAssets(id);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: assets,
      });
    }
  );

  /**
   * POST /api/v1/customers/:id/assets
   * Create asset under customer account
   */
  fastify.post(
    '/:id/assets',
    { preHandler: [requirePermission('assets.create')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const body = CreateAssetSchema.parse({ ...(request.body as any), customerId: id });
      const asset = await assetsService.createAsset(body);

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: asset,
      });
    }
  );

  /**
   * GET /api/v1/customers/:id/sales
   * Customer sales order history
   */
  fastify.get(
    '/:id/sales',
    { preHandler: [requirePermission('sales.view')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const pagination = PaginationQuerySchema.parse(request.query);
      const sales = await customerService.getCustomerSales(id, pagination.page, pagination.limit);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: sales.data,
        pagination: sales.pagination,
      });
    }
  );

  /**
   * GET /api/v1/customers/:id/invoices
   * Customer tax invoices
   */
  fastify.get(
    '/:id/invoices',
    { preHandler: [requirePermission('invoices.view')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const pagination = PaginationQuerySchema.parse(request.query);
      const invoices = await customerService.getCustomerInvoices(id, pagination.page, pagination.limit);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: invoices.data,
        pagination: invoices.pagination,
      });
    }
  );

  /**
   * GET /api/v1/customers/:id/payments
   * Customer payment receipts
   */
  fastify.get(
    '/:id/payments',
    { preHandler: [requirePermission('payments.view')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const pagination = PaginationQuerySchema.parse(request.query);
      const payments = await customerService.getCustomerPayments(id, pagination.page, pagination.limit);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: payments.data,
        pagination: payments.pagination,
      });
    }
  );

  /**
   * GET /api/v1/customers/:id/services
   * Customer service maintenance history
   */
  fastify.get(
    '/:id/services',
    { preHandler: [requirePermission('services.view')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const pagination = PaginationQuerySchema.parse(request.query);
      const services = await customerService.getCustomerServices(id, pagination.page, pagination.limit);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: services.data,
        pagination: services.pagination,
      });
    }
  );

  /**
   * GET /api/v1/customers/:id/warranties
   * Customer machine warranties & claims
   */
  fastify.get(
    '/:id/warranties',
    { preHandler: [requirePermission('warranties.view')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const warranties = await customerService.getCustomerWarranties(id);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: warranties,
      });
    }
  );

  /**
   * GET /api/v1/customers/:id/job-cards
   * Customer job cards
   */
  fastify.get(
    '/:id/job-cards',
    { preHandler: [requirePermission('services.view')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const pagination = PaginationQuerySchema.parse(request.query);
      const jobCards = await customerService.getCustomerJobCards(id, pagination.page, pagination.limit);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: jobCards.data,
        pagination: jobCards.pagination,
      });
    }
  );

  /**
   * GET /api/v1/customers/:id/activities
   * Chronological customer relationship event stream
   */
  fastify.get(
    '/:id/activities',
    { preHandler: [requirePermission('customers.view')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const pagination = PaginationQuerySchema.parse(request.query);
      const activities = await customerService.getCustomerActivities(id, pagination.page, pagination.limit);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: activities.data,
        pagination: activities.pagination,
      });
    }
  );

  /**
   * POST /api/v1/customers/:id/notes
   * Append a note to the customer profile
   */
  fastify.post(
    '/:id/notes',
    { preHandler: [requirePermission('customers.update')] },
    async (request, reply) => {
      const { id } = UuidParamSchema.parse(request.params);
      const body = CustomerNoteSchema.parse(request.body);
      const actorId = request.user?.userId;
      const actorName = request.user?.displayName;

      const customer = await customerService.addCustomerNote(id, body.content, actorId, actorName);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: customer,
      });
    }
  );
};
