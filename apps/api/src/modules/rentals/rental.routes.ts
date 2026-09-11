import type { FastifyPluginAsync } from 'fastify';
import { rentalService } from './rental.service';
import { requirePermission } from '../../middleware/rbac';
import { HTTP_STATUS } from '@crm/shared';

export const rentalRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/rentals
   * List rentals with filtering, search, pagination, and KPI summary
   */
  fastify.get(
    '/',
    { preHandler: [requirePermission('rentals.view')] },
    async (request, reply) => {
      const query = request.query as any;
      const result = await rentalService.listRentals(query);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result.data,
        pagination: result.pagination,
        summary: result.summary,
      });
    }
  );

  /**
   * GET /api/v1/rentals/payments
   * List rental payments across system with filtering, search, pagination
   */
  fastify.get(
    '/payments',
    { preHandler: [requirePermission('rentals.view')] },
    async (request, reply) => {
      try {
        const query = request.query as any;
        const result = await rentalService.listRentalPayments(query);
        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          data: result.data || [],
          pagination: result.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
        });
      } catch (err: any) {
        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        });
      }
    }
  );

  /**
   * GET /api/v1/rentals/payments/:paymentId
   * Get single rental payment detail with receipt information
   */
  fastify.get(
    '/payments/:paymentId',
    { preHandler: [requirePermission('rentals.view')] },
    async (request, reply) => {
      try {
        const { paymentId } = request.params as { paymentId: string };
        const payment = await rentalService.getRentalPaymentById(paymentId);
        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          data: payment,
        });
      } catch (err: any) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { message: err?.message || 'Rental payment not found' },
        });
      }
    }
  );

  /**
   * GET /api/v1/rentals/:id
   * Get single rental agreement with ledger and history
   */
  fastify.get(
    '/:id',
    { preHandler: [requirePermission('rentals.view')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const rental = await rentalService.getRentalById(id);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: rental,
      });
    }
  );

  /**
   * GET /api/v1/rentals/customer/:customerId
   * Get all rentals for a specific customer
   */
  fastify.get(
    '/customer/:customerId',
    { preHandler: [requirePermission('rentals.view')] },
    async (request, reply) => {
      const { customerId } = request.params as { customerId: string };
      const customerRentals = await rentalService.getCustomerRentals(customerId);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: customerRentals,
      });
    }
  );

  /**
   * POST /api/v1/rentals
   * Create new rental agreement
   */
  fastify.post(
    '/',
    { preHandler: [requirePermission('rentals.create')] },
    async (request, reply) => {
      const body = request.body as any;
      const actorId = request.user?.userId;
      const actorName = request.user?.displayName;

      const newRental = await rentalService.createRental({
        ...body,
        createdBy: actorId,
        actorName,
      });

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: newRental,
      });
    }
  );

  /**
   * PUT /api/v1/rentals/:id
   * Update rental agreement
   */
  fastify.put(
    '/:id',
    { preHandler: [requirePermission('rentals.edit')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const updatedRental = await rentalService.updateRental(id, body);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: updatedRental,
      });
    }
  );

  /**
   * POST /api/v1/rentals/:id/payments
   * Record recurring rental payment
   */
  fastify.post(
    '/:id/payments',
    { preHandler: [requirePermission('rentals.edit')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      const actorId = request.user?.userId;
      const actorName = request.user?.displayName;

      const result = await rentalService.recordPayment({
        ...body,
        rentalId: id,
        recordedBy: actorId,
        actorName,
      });

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * POST /api/v1/rentals/:id/return
   * Record machine return
   */
  fastify.post(
    '/:id/return',
    { preHandler: [requirePermission('rentals.edit')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      const actorId = request.user?.userId;
      const actorName = request.user?.displayName;

      const result = await rentalService.recordReturn({
        ...body,
        rentalId: id,
        actorId,
        actorName,
      });

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * DELETE /api/v1/rentals/:id
   * Delete rental record
   */
  fastify.delete(
    '/:id',
    { preHandler: [requirePermission('rentals.delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const deleted = await rentalService.deleteRental(id);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: deleted,
      });
    }
  );
};
