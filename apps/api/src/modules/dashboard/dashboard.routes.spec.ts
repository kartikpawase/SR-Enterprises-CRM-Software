import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const { mockRedisInstance } = vi.hoisted(() => {
  class MockRedisStore {
    private store = new Map<string, { value: string; expiresAt: number }>();
    async set(key: string, value: string): Promise<'OK'> {
      this.store.set(key, { value, expiresAt: Infinity });
      return 'OK';
    }
    async get(key: string): Promise<string | null> {
      const item = this.store.get(key);
      return item ? item.value : null;
    }
    async del(key: string): Promise<number> {
      return this.store.delete(key) ? 1 : 0;
    }
    async expire(): Promise<number> {
      return 1;
    }
  }

  return {
    mockRedisInstance: new MockRedisStore(),
  };
});

vi.mock('../../redis/client', () => ({
  getRedisClient: () => mockRedisInstance,
  redis: mockRedisInstance,
  closeRedisConnection: async () => {},
}));

vi.mock('../../middleware/auth', () => ({
  authenticate: async (request: any) => {
    request.user = {
      userId: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      displayName: 'System Admin',
      role: 'Super Admin',
      permissions: ['customers.view', 'sales.view', 'invoices.view'],
    };
  },
}));

import { buildApp } from '../../app';

describe('Operational Dashboard Fastify Routes Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /api/v1/dashboard/overview returns aggregated operational cards, overview rows, schedule, and payment reminders', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/overview',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    // Verify 5 Primary Operational Cards data
    expect(typeof body.data.cards.servicesDueToday).toBe('number');
    expect(typeof body.data.cards.servicesUrgent).toBe('number');
    expect(typeof body.data.cards.newInquiries).toBe('number');
    expect(typeof body.data.cards.inquiriesUnread).toBe('number');
    expect(typeof body.data.cards.warrantiesExpiring).toBe('number');
    expect(typeof body.data.cards.paymentsDue).toBe('number');
    expect(typeof body.data.cards.paymentsOverdue).toBe('number');
    expect(typeof body.data.cards.techniciansOnDuty).toBe('number');
    expect(typeof body.data.cards.techniciansAvailable).toBe('number');

    // Verify Overview Rows
    expect(typeof body.data.overview.servicesScheduled).toBe('number');
    expect(typeof body.data.overview.newInquiries).toBe('number');
    expect(typeof body.data.overview.warrantiesExpiring).toBe('number');

    // Verify Today's Schedule timeline entries
    expect(body.data.schedule).toBeInstanceOf(Array);

    // Verify Payment Reminders
    expect(body.data.paymentReminders).toBeInstanceOf(Array);
  }, 30000);
});
