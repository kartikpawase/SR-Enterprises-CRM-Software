import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import { ensureDatabaseInitialized, closeDatabaseConnections } from '../database/client';
import { getRedisClient, closeRedisConnection } from '../redis/client';
import { createSession } from '../security/session';
import { AUTH_COOKIE_NAME } from '../security/cookies';
import { HTTP_STATUS } from '@crm/shared';
import { SAFE_FALLBACK_ANSWER } from '../modules/chatbot/chatbot.service';

describe('Chatbot API & Knowledge Training Integration Suite', () => {
  let app: FastifyInstance;
  let adminCookie: string;
  let regularUserCookie: string;
  let trainedKnowledgeId: string;

  beforeAll(async () => {
    await ensureDatabaseInitialized();
    const redis = getRedisClient();

    // 1. Admin Session (Super Admin)
    const adminSession = await createSession(redis, {
      userId: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      displayName: 'Super Admin',
      role: 'Super Admin',
    });
    adminCookie = `${AUTH_COOKIE_NAME}=${adminSession.sessionId}`;

    // 2. Regular User Session (Technician - not allowed to manage training)
    const userSession = await createSession(redis, {
      userId: '00000000-0000-0000-0000-000000000002',
      username: 'technician',
      displayName: 'Field Technician',
      role: 'Technician',
    });
    regularUserCookie = `${AUTH_COOKIE_NAME}=${userSession.sessionId}`;

    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabaseConnections();
    await closeRedisConnection();
  });

  it('PHASE 16 - STEP 1 to 4: Admin creates and publishes knowledge entry', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/knowledge',
      headers: {
        cookie: adminCookie,
        'content-type': 'application/json',
      },
      payload: {
        title: 'Test Service Policy',
        category: 'Services',
        question: 'What is the test service charge?',
        answer: 'The test service charge is ₹999.',
        isActive: true,
      },
    });

    expect(res.statusCode).toBe(HTTP_STATUS.CREATED);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.answer).toBe('The test service charge is ₹999.');
    trainedKnowledgeId = body.data.id;

    // Publish knowledge
    const publishRes = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/knowledge/publish',
      headers: {
        cookie: adminCookie,
      },
    });
    expect(publishRes.statusCode).toBe(HTTP_STATUS.OK);
  });

  it('PHASE 16 - STEP 5: User asks question matching trained data, chatbot answers accurately', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/chat',
      headers: {
        cookie: regularUserCookie,
        'content-type': 'application/json',
      },
      payload: {
        message: 'What is the test service charge?',
      },
    });

    expect(res.statusCode).toBe(HTTP_STATUS.OK);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.matched).toBe(true);
    expect(body.data.answer).toBe('The test service charge is ₹999.');
    expect(body.data.sources.length).toBeGreaterThanOrEqual(1);
    expect(body.data.sources[0].title).toBe('Test Service Policy');
  });

  it('PHASE 16 - STEP 6 & 7: Admin edits training answer to ₹1,099 and publishes', async () => {
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/chatbot/knowledge/${trainedKnowledgeId}`,
      headers: {
        cookie: adminCookie,
        'content-type': 'application/json',
      },
      payload: {
        answer: 'The test service charge is ₹1,099.',
      },
    });

    expect(updateRes.statusCode).toBe(HTTP_STATUS.OK);
    const updateBody = JSON.parse(updateRes.body);
    expect(updateBody.success).toBe(true);
    expect(updateBody.data.answer).toBe('The test service charge is ₹1,099.');
  });

  it('PHASE 16 - STEP 8: User asks again, answer immediately reflects updated ₹1,099', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/chat',
      headers: {
        cookie: regularUserCookie,
        'content-type': 'application/json',
      },
      payload: {
        message: 'What is the test service charge?',
      },
    });

    expect(res.statusCode).toBe(HTTP_STATUS.OK);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.matched).toBe(true);
    expect(body.data.answer).toBe('The test service charge is ₹1,099.');
  });

  it('PHASE 16 - STEP 9 & 10: Admin deactivates knowledge, chatbot falls back and does NOT present old answer', async () => {
    // Deactivate
    const deactivateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/chatbot/knowledge/${trainedKnowledgeId}`,
      headers: {
        cookie: adminCookie,
        'content-type': 'application/json',
      },
      payload: {
        isActive: false,
      },
    });
    expect(deactivateRes.statusCode).toBe(HTTP_STATUS.OK);

    // Ask again
    const chatRes = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/chat',
      headers: {
        cookie: regularUserCookie,
        'content-type': 'application/json',
      },
      payload: {
        message: 'What is the test service charge?',
      },
    });

    expect(chatRes.statusCode).toBe(HTTP_STATUS.OK);
    const body = JSON.parse(chatRes.body);
    expect(body.data.matched).toBe(false);
    expect(body.data.answer).toBe(SAFE_FALLBACK_ANSWER);
    expect(body.data.answer).not.toContain('₹1,099');
    expect(body.data.answer).not.toContain('₹999');
  });

  it('PHASE 17 - Negative Test: Unknown questions return safe fallback without hallucination', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/chat',
      headers: {
        cookie: regularUserCookie,
        'content-type': 'application/json',
      },
      payload: {
        message: 'What is a policy that has never been added to the chatbot knowledge base?',
      },
    });

    expect(res.statusCode).toBe(HTTP_STATUS.OK);
    const body = JSON.parse(res.body);
    expect(body.data.matched).toBe(false);
    expect(body.data.answer).toBe(SAFE_FALLBACK_ANSWER);
  });

  it('PHASE 12 & 13 - Security & Authorization: Non-admin users are rejected from training routes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/knowledge',
      headers: {
        cookie: regularUserCookie,
        'content-type': 'application/json',
      },
      payload: {
        title: 'Unauthorized Policy',
        category: 'Services',
        question: 'Can technician train?',
        answer: 'No.',
      },
    });

    expect(res.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it('Permanently deletes knowledge entry cleanly', async () => {
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chatbot/knowledge/${trainedKnowledgeId}`,
      headers: {
        cookie: adminCookie,
      },
    });

    expect(deleteRes.statusCode).toBe(HTTP_STATUS.OK);

    // Verify gone from list
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/chatbot/knowledge/${trainedKnowledgeId}`,
      headers: {
        cookie: adminCookie,
      },
    });
    expect(getRes.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it('Allows creating knowledge entries with all fields optional (Cases 1-5)', async () => {
    // CASE 1: All fields empty
    const resCase1 = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/knowledge',
      headers: { cookie: adminCookie, 'content-type': 'application/json' },
      payload: { title: '', category: '', question: '', answer: '' },
    });
    expect(resCase1.statusCode).toBe(HTTP_STATUS.CREATED);
    const body1 = JSON.parse(resCase1.body);
    expect(body1.success).toBe(true);
    expect(body1.data.id).toBeDefined();

    // CASE 2: Title only ("Customer")
    const resCase2 = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/knowledge',
      headers: { cookie: adminCookie, 'content-type': 'application/json' },
      payload: { title: 'Customer', category: '', question: '', answer: '' },
    });
    expect(resCase2.statusCode).toBe(HTTP_STATUS.CREATED);
    const body2 = JSON.parse(resCase2.body);
    expect(body2.success).toBe(true);
    expect(body2.data.title).toBe('Customer');

    // CASE 3: Category only ("Customers")
    const resCase3 = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/knowledge',
      headers: { cookie: adminCookie, 'content-type': 'application/json' },
      payload: { title: '', category: 'Customers', question: '', answer: '' },
    });
    expect(resCase3.statusCode).toBe(HTTP_STATUS.CREATED);
    const body3 = JSON.parse(resCase3.body);
    expect(body3.success).toBe(true);
    expect(body3.data.category).toBe('Customers');

    // CASE 4: Question only ("How do I add a customer?")
    const resCase4 = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/knowledge',
      headers: { cookie: adminCookie, 'content-type': 'application/json' },
      payload: { title: '', category: '', question: 'How do I add a customer?', answer: '' },
    });
    expect(resCase4.statusCode).toBe(HTTP_STATUS.CREATED);
    const body4 = JSON.parse(resCase4.body);
    expect(body4.success).toBe(true);
    expect(body4.data.question).toBe('How do I add a customer?');

    // CASE 5: Answer only ("Customers can be added from the Customers module.")
    const resCase5 = await app.inject({
      method: 'POST',
      url: '/api/v1/chatbot/knowledge',
      headers: { cookie: adminCookie, 'content-type': 'application/json' },
      payload: { title: '', category: '', question: '', answer: 'Customers can be added from the Customers module.' },
    });
    expect(resCase5.statusCode).toBe(HTTP_STATUS.CREATED);
    const body5 = JSON.parse(resCase5.body);
    expect(body5.success).toBe(true);
    expect(body5.data.answer).toBe('Customers can be added from the Customers module.');

    // Clean up created records
    for (const res of [resCase1, resCase2, resCase3, resCase4, resCase5]) {
      const id = JSON.parse(res.body).data.id;
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/chatbot/knowledge/${id}`,
        headers: { cookie: adminCookie },
      });
    }
  });
});
