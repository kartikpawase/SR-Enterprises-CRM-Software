import crypto from 'node:crypto';
import { env } from '../../config/env';
import type {
  WhatsAppProvider,
  WhatsAppProviderSendResult,
  WhatsAppWebhookEventData,
} from '@crm/types';

/**
 * Meta Official WhatsApp Business Cloud API Provider
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  public name = 'META_CLOUD_API';
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;
  private apiUrl: string;
  private appSecret?: string | undefined;

  constructor(config?: {
    phoneNumberId?: string;
    accessToken?: string;
    apiVersion?: string;
    apiUrl?: string;
    appSecret?: string;
  }) {
    this.phoneNumberId = (config?.phoneNumberId || env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
    this.accessToken = (config?.accessToken || env.WHATSAPP_ACCESS_TOKEN || '').trim();
    this.apiVersion = (config?.apiVersion || env.WHATSAPP_API_VERSION || 'v21.0').trim();
    this.apiUrl = (config?.apiUrl || env.WHATSAPP_API_URL || 'https://graph.facebook.com').replace(/\/+$/, '').trim();
    this.appSecret = config?.appSecret || env.WHATSAPP_WEBHOOK_APP_SECRET;
  }

  private cleanPhone(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  private isConfigValid(): boolean {
    return Boolean(
      this.phoneNumberId &&
      this.accessToken &&
      !this.phoneNumberId.includes('placeholder') &&
      !this.accessToken.includes('placeholder')
    );
  }

  private getMessagesEndpoint(): string {
    if (this.apiUrl.includes('/v')) {
      return `${this.apiUrl}/${this.phoneNumberId}/messages`;
    }
    return `${this.apiUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  /**
   * Send Direct Text Message via Meta Cloud API
   */
  async sendTextMessage(to: string, text: string): Promise<WhatsAppProviderSendResult> {
    if (!this.isConfigValid()) {
      return {
        success: false,
        status: 'FAILED',
        error: {
          code: 'PROVIDER_CONFIG_MISSING',
          message: 'WhatsApp service is not configured. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in server environment.',
        },
      };
    }

    const cleanTo = this.cleanPhone(to);
    if (!cleanTo || cleanTo.length < 10) {
      return {
        success: false,
        status: 'FAILED',
        error: {
          code: 'INVALID_RECIPIENT_PHONE',
          message: 'Invalid technician mobile number. Recipient phone number must be at least 10 digits.',
        },
      };
    }

    const url = this.getMessagesEndpoint();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        }),
      });

      const data = (await response.json().catch(() => null)) as any;

      if (!response.ok) {
        const errorDetail =
          data?.error?.error_user_msg ||
          data?.error?.message ||
          data?.message ||
          response.statusText ||
          'WhatsApp API rejected the message';
        const errorCode = data?.error?.code ? String(data.error.code) : 'META_API_ERROR';

        return {
          success: false,
          status: 'FAILED',
          error: {
            code: errorCode,
            message: `WhatsApp delivery failed: ${errorDetail}`,
          },
        };
      }

      const providerMessageId = data?.messages?.[0]?.id;
      if (!providerMessageId) {
        return {
          success: false,
          status: 'FAILED',
          error: {
            code: 'NO_MESSAGE_ID',
            message: 'WhatsApp provider did not return a valid message confirmation ID.',
          },
        };
      }

      return {
        success: true,
        providerMessageId,
        status: 'SENT',
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        error: {
          code: 'NETWORK_ERROR',
          message: `Failed to reach WhatsApp API endpoint: ${err?.message || 'Network error'}`,
        },
      };
    }
  }

  /**
   * Send Pre-Approved Meta Template Message
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = 'en_US',
    parameters: Record<string, string> = {}
  ): Promise<WhatsAppProviderSendResult> {
    if (!this.phoneNumberId || !this.accessToken) {
      return {
        success: false,
        status: 'FAILED',
        error: {
          code: 'PROVIDER_CONFIG_MISSING',
          message: 'Meta WhatsApp credentials are not configured.',
        },
      };
    }

    const cleanTo = this.cleanPhone(to);
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    const bodyParameters = Object.values(parameters).map((paramVal) => ({
      type: 'text',
      text: paramVal,
    }));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            components:
              bodyParameters.length > 0
                ? [
                    {
                      type: 'body',
                      parameters: bodyParameters,
                    },
                  ]
                : undefined,
          },
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        return {
          success: false,
          status: 'FAILED',
          error: {
            code: data?.error?.code ? String(data.error.code) : 'META_TEMPLATE_ERROR',
            message: data?.error?.message || response.statusText,
          },
        };
      }

      const providerMessageId = data?.messages?.[0]?.id;
      return {
        success: true,
        providerMessageId,
        status: 'SENT',
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        error: {
          code: 'NETWORK_ERROR',
          message: err?.message || 'Failed to reach Meta WhatsApp API endpoint',
        },
      };
    }
  }

  /**
   * Cryptographically validate X-Hub-Signature-256 header using App Secret
   */
  validateWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    if (!this.appSecret) {
      // In dev or without configured secret, reject or log
      return true;
    }
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    try {
      const expectedSignature = signatureHeader.substring(7);
      const hmac = crypto.createHmac('sha256', this.appSecret);
      hmac.update(rawBody);
      const calculatedSignature = hmac.digest('hex');

      const calcBuf = Buffer.from(calculatedSignature, 'utf8');
      const expBuf = Buffer.from(expectedSignature, 'utf8');

      if (calcBuf.length !== expBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(calcBuf, expBuf);
    } catch {
      return false;
    }
  }

  /**
   * Parse Meta Webhook JSON Payload into structured events
   */
  parseWebhookPayload(payload: any): WhatsAppWebhookEventData[] {
    const events: WhatsAppWebhookEventData[] = [];
    if (!payload || !payload.entry) return events;

    for (const entry of payload.entry) {
      if (!entry.changes) continue;
      for (const change of entry.changes) {
        const value = change.value;
        if (!value) continue;

        // 1. Handle Message Status Updates (sent -> delivered -> read -> failed)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const statusStr = (statusObj.status || '').toUpperCase();
            let parsedStatus: any = 'SENT';
            if (statusStr === 'DELIVERED') parsedStatus = 'DELIVERED';
            else if (statusStr === 'READ') parsedStatus = 'READ';
            else if (statusStr === 'FAILED') parsedStatus = 'FAILED';

            events.push({
              eventId: `status_${statusObj.id}_${statusObj.status}_${statusObj.timestamp}`,
              eventType: 'message_status_update',
              providerMessageId: statusObj.id,
              status: parsedStatus,
              timestamp: statusObj.timestamp ? new Date(Number(statusObj.timestamp) * 1000) : new Date(),
              to: statusObj.recipient_id,
              errorCode: statusObj.errors?.[0]?.code ? String(statusObj.errors[0].code) : undefined,
              errorMessage: statusObj.errors?.[0]?.title || statusObj.errors?.[0]?.message,
              raw: statusObj,
            });
          }
        }

        // 2. Handle Inbound Incoming Messages
        if (value.messages && Array.isArray(value.messages)) {
          for (const msgObj of value.messages) {
            let messageText = '';
            if (msgObj.type === 'text' && msgObj.text?.body) {
              messageText = msgObj.text.body;
            } else if (msgObj.type === 'button') {
              messageText = msgObj.button?.text || '';
            } else if (msgObj.type === 'interactive') {
              messageText =
                msgObj.interactive?.button_reply?.title ||
                msgObj.interactive?.list_reply?.title ||
                '[Interactive Response]';
            } else {
              messageText = `[Received ${msgObj.type || 'media'} message]`;
            }

            events.push({
              eventId: `inbound_${msgObj.id}`,
              eventType: 'inbound_message',
              providerMessageId: msgObj.id,
              status: 'DELIVERED',
              from: msgObj.from,
              messageText,
              timestamp: msgObj.timestamp ? new Date(Number(msgObj.timestamp) * 1000) : new Date(),
              raw: msgObj,
            });
          }
        }
      }
    }

    return events;
  }
}

/**
 * Local-First / Development Simulator WhatsApp Provider
 * Provides robust offline operations and test predictability
 */
export class DevWhatsAppProvider implements WhatsAppProvider {
  public name = 'DEV_LOCAL_SIMULATOR';

  async sendTextMessage(_to: string, _text: string): Promise<WhatsAppProviderSendResult> {
    const providerMessageId = `wamid.DEV_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    return {
      success: true,
      providerMessageId,
      status: 'SENT',
    };
  }

  async sendTemplateMessage(
    _to: string,
    _templateName: string,
    _languageCode = 'en_US',
    _parameters: Record<string, string> = {}
  ): Promise<WhatsAppProviderSendResult> {
    const providerMessageId = `wamid.DEV_TPL_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    return {
      success: true,
      providerMessageId,
      status: 'SENT',
    };
  }

  validateWebhookSignature(_rawBody: string, _signatureHeader?: string): boolean {
    return true; // Always valid in simulator mode
  }

  parseWebhookPayload(payload: any): WhatsAppWebhookEventData[] {
    const metaParser = new MetaWhatsAppProvider();
    return metaParser.parseWebhookPayload(payload);
  }
}

/**
 * Provider Factory
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (process.env.NODE_ENV === 'test' && (process.env.WHATSAPP_PROVIDER === 'MOCK' || env.WHATSAPP_PROVIDER === 'MOCK')) {
    return new DevWhatsAppProvider();
  }
  return new MetaWhatsAppProvider();
}
