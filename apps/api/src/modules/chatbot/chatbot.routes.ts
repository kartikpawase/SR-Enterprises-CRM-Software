import type { FastifyPluginAsync } from 'fastify';
import { HTTP_STATUS } from '@crm/shared';
import {
  CreateChatbotKnowledgeSchema,
  UpdateChatbotKnowledgeSchema,
  ChatbotKnowledgeFilterSchema,
  ChatbotMessageQuerySchema,
  UuidParamSchema,
} from '@crm/validation';
import { chatbotService } from './chatbot.service';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

export const chatbotRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================================
  // USER-FACING CHAT ENDPOINTS (Authenticated CRM Users)
  // ============================================================

  /**
   * POST /api/v1/chatbot/chat
   * Ask question to the chatbot. Answers strictly based on admin-trained data.
   */
  fastify.post(
    '/chat',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const parsedBody = ChatbotMessageQuerySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid message query',
            details: parsedBody.error.flatten(),
          },
        });
      }

      const userId = request.user?.userId;
      const { message, conversationId } = parsedBody.data;

      const result = await chatbotService.processChat(message, conversationId, userId);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * GET /api/v1/chatbot/conversations/:id/messages
   * Get messages for a given conversation session.
   */
  fastify.get(
    '/conversations/:id/messages',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const params = UuidParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid conversation UUID' },
        });
      }

      const messages = await chatbotService.getConversationMessages(params.data.id);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: messages,
      });
    }
  );

  // ============================================================
  // ADMIN-TRAINING ENDPOINTS (Super Admin & Admin Only)
  // ============================================================

  /**
   * GET /api/v1/chatbot/knowledge
   * List all knowledge base training entries with search & status filters.
   */
  fastify.get(
    '/knowledge',
    {
      preHandler: [authenticate, requireRole('Super Admin', 'Admin')],
    },
    async (request, reply) => {
      const query = ChatbotKnowledgeFilterSchema.safeParse(request.query);
      const filters = query.success ? query.data : {};

      const result = await chatbotService.listKnowledge(filters);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      });
    }
  );

  /**
   * GET /api/v1/chatbot/knowledge/:id
   * Get single training entry details.
   */
  fastify.get(
    '/knowledge/:id',
    {
      preHandler: [authenticate, requireRole('Super Admin', 'Admin')],
    },
    async (request, reply) => {
      const params = UuidParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid knowledge UUID' },
        });
      }

      const item = await chatbotService.getKnowledgeById(params.data.id);
      if (!item) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Knowledge entry not found' },
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: item,
      });
    }
  );

  /**
   * POST /api/v1/chatbot/knowledge
   * Add a new training knowledge entry.
   */
  fastify.post(
    '/knowledge',
    {
      preHandler: [authenticate, requireRole('Super Admin', 'Admin')],
    },
    async (request, reply) => {
      const parsedBody = CreateChatbotKnowledgeSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed for training entry',
            details: parsedBody.error.flatten(),
          },
        });
      }

      const userId = request.user?.userId;
      const created = await chatbotService.createKnowledge(parsedBody.data, userId);

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: created,
        message: 'Knowledge entry trained successfully.',
      });
    }
  );

  /**
   * PUT /api/v1/chatbot/knowledge/:id
   * Update an existing training knowledge entry.
   */
  fastify.put(
    '/knowledge/:id',
    {
      preHandler: [authenticate, requireRole('Super Admin', 'Admin')],
    },
    async (request, reply) => {
      const params = UuidParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid knowledge UUID' },
        });
      }

      const parsedBody = UpdateChatbotKnowledgeSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed for training update',
            details: parsedBody.error.flatten(),
          },
        });
      }

      const updated = await chatbotService.updateKnowledge(params.data.id, parsedBody.data);
      if (!updated) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Knowledge entry not found' },
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: updated,
        message: 'Knowledge entry updated successfully.',
      });
    }
  );

  /**
   * DELETE /api/v1/chatbot/knowledge/:id
   * Delete a training knowledge entry.
   */
  fastify.delete(
    '/knowledge/:id',
    {
      preHandler: [authenticate, requireRole('Super Admin', 'Admin')],
    },
    async (request, reply) => {
      const params = UuidParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid knowledge UUID' },
        });
      }

      const deleted = await chatbotService.deleteKnowledge(params.data.id);
      if (!deleted) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Knowledge entry not found' },
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        message: 'Knowledge entry permanently removed.',
      });
    }
  );

  /**
   * POST /api/v1/chatbot/knowledge/publish
   * Publish & activate all active training updates immediately.
   */
  fastify.post(
    '/knowledge/publish',
    {
      preHandler: [authenticate, requireRole('Super Admin', 'Admin')],
    },
    async (_request, reply) => {
      const result = await chatbotService.publishKnowledge();

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result,
        message: `Successfully published ${result.publishedCount} knowledge entries to live chatbot.`,
      });
    }
  );
};
