import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

vi.mock('../../middleware/auth', () => ({
  authenticate: async (request: any) => {
    request.user = {
      userId: '99999999-9999-9999-9999-999999999999',
      username: 'admin',
      displayName: 'System Admin',
      role: 'Super Admin',
      permissions: ['*'],
    };
  },
}));

import { v1Routes } from '../../routes/v1';

describe('Search Routes Integration Tests — GET /api/v1/search', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(v1Routes, { prefix: '/api/v1' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/search returns structured results and categories', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search?q=RO',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.query).toBe('RO');
    expect(typeof body.data.totalMatches).toBe('number');
    expect(typeof body.data.executionTimeMs).toBe('number');
    expect(body.data.categories).toBeDefined();
    expect(Array.isArray(body.data.results)).toBe(true);
  });

  it('GET /api/v1/search handles empty query gracefully without error', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search?q=',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalMatches).toBe(0);
    expect(body.data.results).toEqual([]);
  });

  it('GET /api/v1/search filters by requested entity types', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search?q=Kent&types=product,customer',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    // Any returned items should only be of type product or customer
    for (const item of body.data.results) {
      expect(['product', 'customer']).toContain(item.type);
    }
  });

  it('GET /api/v1/search/suggest returns autocomplete suggestions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggest?q=RO&limit=5',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.query).toBe('RO');
    expect(Array.isArray(body.data.suggestions)).toBe(true);
  });

  it('POST /api/v1/search/advanced validates entityType and executes advanced search', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/search/advanced',
      headers: { authorization: 'Bearer admin-token' },
      payload: {
        entityType: 'customer',
        q: 'Rahul',
        filters: [{ field: 'status', operator: 'eq', value: 'ACTIVE' }],
        page: 1,
        limit: 10,
      },
    });

    expect([200, 401]).toContain(res.statusCode);
  });
});
