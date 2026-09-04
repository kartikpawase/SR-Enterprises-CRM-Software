import type { FastifyPluginAsync } from 'fastify';
import { DuesQuerySchema, DuesMonthSummaryQuerySchema } from '@crm/validation';
import { duesRepository } from './dues.repository';
import { authenticate } from '../../middleware/auth';
import { HTTP_STATUS } from '@crm/shared';

export const duesRoutes: FastifyPluginAsync = async (fastify) => {
  // All dues endpoints require valid server session authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * Helper to format current date in Asia/Kolkata (IST) as YYYY-MM-DD
   */
  const getTodayIST = (): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // e.g. "2026-09-03"
  };

  /**
   * GET /api/v1/dues
   * Retrieve all existing CRM activities scheduled/due for the selected date
   */
  fastify.get('/', async (request, reply) => {
    const query = DuesQuerySchema.parse(request.query);
    const targetDate = query.date ? query.date.trim() : getTodayIST();

    const result = await duesRepository.getDuesForDate(targetDate);

    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: result,
    });
  });

  /**
   * GET /api/v1/dues/month-summary
   * Retrieve per-day activity counts for a given month to support the interactive calendar view
   */
  fastify.get('/month-summary', async (request, reply) => {
    const query = DuesMonthSummaryQuerySchema.parse(request.query);
    const now = new Date();
    const year = query.year || now.getFullYear();
    const month = query.month || now.getMonth() + 1;

    const result = await duesRepository.getMonthSummary(year, month);

    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: {
        year,
        month,
        counts: result,
      },
    });
  });
};
