import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { DevWhatsAppProvider, MetaWhatsAppProvider } from './whatsapp.provider';
import { env } from '../../config/env';

const { mockRedisInstance, mockWhatsAppService } = vi.hoisted(() => {
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
  }

  const mockWhatsAppService = {
    getApprovedTemplates: vi.fn().mockReturnValue([
      {
        id: 'invoice_reminder',
        name: 'invoice_reminder',
        category: 'TRANSACTIONAL',
        language: 'en',
        parameterKeys: ['customer_name', 'invoice_number', 'amount_due', 'due_date'],
        sampleText: 'Dear {{customer_name}}, invoice {{invoice_number}} of Rs. {{amount_due}} is due on {{due_date}}.',
      },
    ]),
    listConversations: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'conv-1111',
          contactId: 'contact-1111',
          customerId: 'cust-1111',
          status: 'ACTIVE',
          unreadCount: 0,
          lastMessagePreview: 'Thank you for the prompt service',
          contact: { phone: '9876543210', optInStatus: 'OPTED_IN' },
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    getConversationById: vi.fn().mockResolvedValue({
      id: 'conv-1111',
      contactId: 'contact-1111',
      status: 'ACTIVE',
    }),
    listMessages: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'msg-1111',
          conversationId: 'conv-1111',
          direction: 'OUTBOUND',
          content: 'Dear Customer, your invoice is ready.',
          status: 'DELIVERED',
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    }),
    sendTextMessage: vi.fn().mockResolvedValue({
      id: 'msg-2222',
      direction: 'OUTBOUND',
      content: 'Hello from SR Enterprises',
      status: 'SENT',
    }),
    sendTemplateMessage: vi.fn().mockResolvedValue({
      id: 'msg-3333',
      direction: 'OUTBOUND',
      templateName: 'invoice_reminder',
      status: 'SENT',
    }),
    markAsRead: vi.fn().mockResolvedValue(true),
    processWebhook: vi.fn().mockResolvedValue([
      { eventId: 'ev-1', status: 'PROCESSED_STATUS', updated: true },
    ]),
  };

  return {
    mockRedisInstance: new MockRedisStore(),
    mockWhatsAppService,
  };
});

vi.mock('../../redis/client', () => ({
  getRedisClient: () => mockRedisInstance,
  redis: mockRedisInstance,
  closeRedisConnection: async () => {},
}));

vi.mock('./whatsapp.service', () => ({
  whatsappService: mockWhatsAppService,
}));

vi.mock('../../middleware/auth', () => ({
  authenticate: async (request: any) => {
    request.user = {
      id: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      displayName: 'System Admin',
      role: 'Super Admin',
      permissions: ['whatsapp.view', 'whatsapp.send', 'whatsapp.manage'],
    };
  },
}));

import { buildApp } from '../../app';

describe('WhatsApp Integration Foundation (Phase 9)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DevWhatsAppProvider Unit Tests', () => {
    const devProvider = new DevWhatsAppProvider();

    it('should successfully send mock text message', async () => {
      const result = await devProvider.sendTextMessage('9876543210', 'Test message');
      expect(result.status).toBe('SENT');
      expect(result.providerMessageId).toMatch(/^wamid\.DEV_/);
    });

    it('should successfully send mock template message', async () => {
      const result = await devProvider.sendTemplateMessage(
        '9876543210',
        'invoice_reminder',
        'en',
        { customer_name: 'Rajesh', invoice_number: 'INV-001' }
      );
      expect(result.status).toBe('SENT');
      expect(result.providerMessageId).toBeDefined();
    });

    it('should validate webhook signature without error in development mode', () => {
      expect(devProvider.validateWebhookSignature('payload', 'sha256=any')).toBe(true);
    });
  });

  describe('MetaWhatsAppProvider Signature Verification', () => {
    const metaProvider = new MetaWhatsAppProvider({
      appSecret: 'test-secret-key-12345',
      accessToken: 'dummy-token',
      phoneNumberId: '1234567890',
    });

    it('should correctly verify valid HMAC SHA-256 signatures', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
      const hmac = crypto.createHmac('sha256', 'test-secret-key-12345');
      hmac.update(payload);
      const signatureHeader = `sha256=${hmac.digest('hex')}`;

      const isValid = metaProvider.validateWebhookSignature(payload, signatureHeader);
      expect(isValid).toBe(true);
    });

    it('should reject tampered or invalid HMAC SHA-256 signatures', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });
      const invalidSignatureHeader = 'sha256=invalidhex00000000000000000000000000000000000000000000000000000000';

      const isValid = metaProvider.validateWebhookSignature(payload, invalidSignatureHeader);
      expect(isValid).toBe(false);
    });
  });

  describe('WhatsApp Webhook Handshake & Ingestion Routes', () => {
    it('GET /api/v1/webhooks/whatsapp should respond with challenge on valid subscription token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${env.WHATSAPP_WEBHOOK_VERIFY_TOKEN}&hub.challenge=1158201444`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('1158201444');
    });

    it('GET /api/v1/webhooks/whatsapp should return 403 Forbidden on invalid verify token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=1158201444',
      });

      expect(response.statusCode).toBe(403);
    });

    it('POST /api/v1/webhooks/whatsapp should process incoming webhook payload', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '12345',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '919876543210', phone_number_id: '12345' },
                  statuses: [
                    {
                      id: 'wamid.HBgLMTIzNDU2Nzg5MA==',
                      status: 'delivered',
                      timestamp: '1600000000',
                      recipient_id: '919876543210',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/whatsapp',
        payload,
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.status).toBe('EVENT_RECEIVED');
      expect(mockWhatsAppService.processWebhook).toHaveBeenCalled();
    });
  });

  describe('WhatsApp Authenticated CRM Routes', () => {
    it('GET /api/v1/whatsapp/templates should list approved templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/whatsapp/templates',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data[0].name).toBe('invoice_reminder');
    });

    it('POST /api/v1/whatsapp/messages should send outbound message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/messages',
        payload: {
          phone: '9876543210',
          content: 'Hello from SR Enterprises',
        },
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('SENT');
    });

    it('POST /api/v1/whatsapp/send-template should dispatch template message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/send-template',
        payload: {
          templateName: 'invoice_reminder',
          recipientPhone: '9876543210',
          parameters: {
            customer_name: 'Rajesh',
            invoice_number: 'INV-2026-0001',
            amount_due: '2500',
            due_date: '25 Aug 2026',
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.templateName).toBe('invoice_reminder');
    });
  });
});
