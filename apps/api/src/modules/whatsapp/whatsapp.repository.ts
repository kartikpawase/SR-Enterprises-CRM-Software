import { db } from '../../database/client';
import {
  whatsappContacts,
  whatsappConversations,
  whatsappMessages,
  whatsappEvents,
  customers,
} from '../../database/schema/index';
import { eq, and, or, ilike, desc, asc, count, sql } from 'drizzle-orm';
import type {
  WhatsAppOptInStatus,
  WhatsAppMessageStatus,
  WhatsAppMessageType,
  WhatsAppConversationQueryFilters,
  WhatsAppContact,
  WhatsAppConversation,
  WhatsAppMessage,
} from '@crm/types';

export class WhatsAppRepository {
  /**
   * Normalize and format phone number to E.164 international standard (+91...)
   */
  normalizePhone(phone: string): string {
    let clean = phone.replace(/[^0-9+]/g, '');
    if (!clean.startsWith('+')) {
      if (clean.length === 10) {
        clean = `+91${clean}`; // Default to India country code
      } else if (clean.length === 12 && clean.startsWith('91')) {
        clean = `+${clean}`;
      } else {
        clean = `+${clean}`;
      }
    }
    return clean;
  }

  /**
   * Find or initialize a WhatsApp contact record
   */
  async findOrCreateContact(
    phone: string,
    customerId?: string | null,
    waId?: string | null,
    database = db
  ): Promise<WhatsAppContact> {
    const formattedPhone = this.normalizePhone(phone);

    // 1. Check existing contact by phone
    const contact = await database.query.whatsappContacts.findFirst({
      where: eq(whatsappContacts.phone, formattedPhone),
    });

    if (contact) {
      if ((!contact.customerId && customerId) || (!contact.waId && waId)) {
        const [updated] = await database
          .update(whatsappContacts)
          .set({
            customerId: contact.customerId || customerId || null,
            waId: contact.waId || waId || null,
            updatedAt: new Date(),
          })
          .where(eq(whatsappContacts.id, contact.id))
          .returning();
        return updated as unknown as WhatsAppContact;
      }
      return contact as unknown as WhatsAppContact;
    }

    // 2. If customerId not provided, search if a customer exists with this phone
    let resolvedCustomerId = customerId || null;
    if (!resolvedCustomerId) {
      const digits = formattedPhone.replace(/[^0-9]/g, '');
      const local10 = digits.length >= 10 ? digits.slice(-10) : digits;
      const matchedCustomer = await database.query.customers.findFirst({
        where: or(
          eq(customers.phone, formattedPhone),
          ilike(customers.phone, `%${local10}%`)
        ),
      });
      if (matchedCustomer) {
        resolvedCustomerId = matchedCustomer.id;
      }
    }

    // 3. Create new WhatsApp contact
    const [newContact] = await database
      .insert(whatsappContacts)
      .values({
        phone: formattedPhone,
        customerId: resolvedCustomerId,
        waId: waId || null,
        optInStatus: 'UNKNOWN',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newContact as unknown as WhatsAppContact;
  }

  /**
   * Find or create conversation thread for contact
   */
  async findOrCreateConversation(
    contactId: string,
    customerId?: string | null,
    database = db
  ): Promise<WhatsAppConversation> {
    const conversation = await database.query.whatsappConversations.findFirst({
      where: eq(whatsappConversations.contactId, contactId),
    });

    if (!conversation) {
      const [newConv] = await database
        .insert(whatsappConversations)
        .values({
          contactId,
          customerId: customerId || null,
          status: 'ACTIVE',
          unreadCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return newConv as unknown as WhatsAppConversation;
    }

    return conversation as unknown as WhatsAppConversation;
  }

  /**
   * Find paginated conversations with customer & contact joins
   */
  async findConversations(filters: WhatsAppConversationQueryFilters = {}, database = db) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filters.status) {
      conditions.push(eq(whatsappConversations.status, filters.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRecord] = await database
      .select({ total: count() })
      .from(whatsappConversations)
      .where(whereClause);

    const total = Number(totalRecord?.total || 0);

    const records = await database.query.whatsappConversations.findMany({
      where: whereClause,
      orderBy: [desc(whatsappConversations.lastMessageAt), desc(whatsappConversations.updatedAt)],
      limit,
      offset,
      with: {
        contact: true,
        customer: {
          columns: {
            id: true,
            customerNumber: true,
            fullName: true,
            phone: true,
            customerType: true,
            status: true,
          },
        },
      },
    });

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find single conversation by ID with contact and customer details
   */
  async findConversationById(id: string, database = db) {
    return database.query.whatsappConversations.findFirst({
      where: eq(whatsappConversations.id, id),
      with: {
        contact: true,
        customer: {
          columns: {
            id: true,
            customerNumber: true,
            fullName: true,
            phone: true,
            email: true,
            customerType: true,
            companyName: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Find paginated messages for a conversation
   */
  async findMessages(conversationId: string, page = 1, limit = 50, database = db) {
    const offset = (page - 1) * limit;

    const [totalRecord] = await database
      .select({ total: count() })
      .from(whatsappMessages)
      .where(eq(whatsappMessages.conversationId, conversationId));

    const total = Number(totalRecord?.total || 0);

    const records = await database.query.whatsappMessages.findMany({
      where: eq(whatsappMessages.conversationId, conversationId),
      orderBy: [asc(whatsappMessages.createdAt)],
      limit,
      offset,
      with: {
        sender: {
          columns: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create Outbound WhatsApp Message record (locally stored first)
   */
  async createOutboundMessage(
    params: {
      conversationId: string;
      contactId: string;
      content: string;
      messageType?: WhatsAppMessageType;
      templateName?: string;
      templateParams?: Record<string, unknown>;
      sentByUserId?: string;
      status?: WhatsAppMessageStatus;
    },
    database = db
  ): Promise<WhatsAppMessage> {
    const [msg] = await database
      .insert(whatsappMessages)
      .values({
        conversationId: params.conversationId,
        contactId: params.contactId,
        direction: 'OUTBOUND',
        messageType: params.messageType || 'TEXT',
        content: params.content,
        templateName: params.templateName || null,
        templateParams: params.templateParams || null,
        status: params.status || 'QUEUED',
        sentByUserId: params.sentByUserId || null,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Update conversation preview and timestamp
    await database
      .update(whatsappConversations)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: params.content.slice(0, 100),
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversations.id, params.conversationId));

    return msg as unknown as WhatsAppMessage;
  }

  /**
   * Update message status from provider response or webhook status callback
   */
  async updateMessageStatus(
    messageId: string,
    params: {
      providerMessageId?: string;
      status: WhatsAppMessageStatus;
      errorCode?: string;
      errorMessage?: string;
      timestamp?: Date;
    },
    database = db
  ): Promise<WhatsAppMessage> {
    const updatePayload: Record<string, unknown> = {
      status: params.status,
      updatedAt: new Date(),
    };

    if (params.providerMessageId) updatePayload.providerMessageId = params.providerMessageId;
    if (params.errorCode) updatePayload.errorCode = params.errorCode;
    if (params.errorMessage) updatePayload.errorMessage = params.errorMessage;

    const eventTime = params.timestamp || new Date();
    if (params.status === 'SENT') updatePayload.sentAt = eventTime;
    if (params.status === 'DELIVERED') updatePayload.deliveredAt = eventTime;
    if (params.status === 'READ') updatePayload.readAt = eventTime;
    if (params.status === 'FAILED') updatePayload.failedAt = eventTime;

    const [updated] = await database
      .update(whatsappMessages)
      .set(updatePayload)
      .where(eq(whatsappMessages.id, messageId))
      .returning();

    return updated as unknown as WhatsAppMessage;
  }

  /**
   * Update message status by provider message ID (from incoming webhook)
   */
  async updateMessageStatusByProviderId(
    providerMessageId: string,
    status: WhatsAppMessageStatus,
    errorDetails?: { code?: string; message?: string },
    timestamp?: Date,
    database = db
  ): Promise<WhatsAppMessage | null> {
    const existing = await database.query.whatsappMessages.findFirst({
      where: eq(whatsappMessages.providerMessageId, providerMessageId),
    });

    if (!existing) {
      return null;
    }

    return this.updateMessageStatus(
      existing.id,
      {
        providerMessageId,
        status,
        ...(errorDetails?.code ? { errorCode: errorDetails.code } : {}),
        ...(errorDetails?.message ? { errorMessage: errorDetails.message } : {}),
        ...(timestamp ? { timestamp } : {}),
      },
      database
    );
  }

  /**
   * Ingest an incoming inbound WhatsApp message from Webhook
   */
  async createInboundMessage(
    params: {
      fromPhone: string;
      providerMessageId: string;
      content: string;
      timestamp?: Date;
    },
    database = db
  ): Promise<WhatsAppMessage> {
    // 1. Deduplication check: Do not re-insert existing provider message ID
    const existing = await database.query.whatsappMessages.findFirst({
      where: eq(whatsappMessages.providerMessageId, params.providerMessageId),
    });
    if (existing) {
      return existing as unknown as WhatsAppMessage;
    }

    // 2. Resolve Contact & Conversation
    const contact = await this.findOrCreateContact(params.fromPhone, null, null, database);
    const conversation = await this.findOrCreateConversation(contact.id, contact.customerId, database);

    const msgTime = params.timestamp || new Date();

    // 3. Insert Inbound Message
    const [inboundMsg] = await database
      .insert(whatsappMessages)
      .values({
        conversationId: conversation.id,
        contactId: contact.id,
        providerMessageId: params.providerMessageId,
        direction: 'INBOUND',
        messageType: 'TEXT',
        content: params.content,
        status: 'DELIVERED',
        deliveredAt: msgTime,
        createdAt: msgTime,
        updatedAt: msgTime,
      })
      .returning();

    // 4. Update Conversation: increment unreadCount, update lastMessage
    await database
      .update(whatsappConversations)
      .set({
        unreadCount: sql`${whatsappConversations.unreadCount} + 1`,
        lastMessageAt: msgTime,
        lastMessagePreview: params.content.slice(0, 100),
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversations.id, conversation.id));

    // 5. Update Contact last interaction
    await database
      .update(whatsappContacts)
      .set({
        lastInteractionAt: msgTime,
        updatedAt: new Date(),
      })
      .where(eq(whatsappContacts.id, contact.id));

    return inboundMsg as unknown as WhatsAppMessage;
  }

  /**
   * Record Webhook Event for Idempotency
   * Returns true if event is NEW, false if already processed
   */
  async recordEventIfNew(
    providerEventId: string,
    eventType: string,
    payload: Record<string, unknown>,
    database = db
  ): Promise<boolean> {
    try {
      const existing = await database.query.whatsappEvents.findFirst({
        where: eq(whatsappEvents.providerEventId, providerEventId),
      });

      if (existing) {
        return false;
      }

      await database.insert(whatsappEvents).values({
        providerEventId,
        eventType,
        payload,
        processedAt: new Date(),
        createdAt: new Date(),
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update Opt-in / Consent Status
   */
  async updateConsent(contactId: string, optInStatus: WhatsAppOptInStatus, database = db) {
    const now = new Date();
    const [updated] = await database
      .update(whatsappContacts)
      .set({
        optInStatus,
        optInTimestamp: optInStatus === 'OPTED_IN' ? now : undefined,
        optOutTimestamp: optInStatus === 'OPTED_OUT' ? now : undefined,
        updatedAt: now,
      })
      .where(eq(whatsappContacts.id, contactId))
      .returning();

    return updated as unknown as WhatsAppContact;
  }

  /**
   * Mark Conversation as Read
   */
  async markConversationAsRead(conversationId: string, database = db) {
    await database
      .update(whatsappConversations)
      .set({
        unreadCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversations.id, conversationId));
  }

  /**
   * Find outbound messages containing substring (for idempotency checks)
   */
  async findMessagesByContentSubstring(substring: string, database = db): Promise<WhatsAppMessage[]> {
    try {
      const records = await database
        .select()
        .from(whatsappMessages)
        .where(ilike(whatsappMessages.content, `%${substring}%`))
        .orderBy(desc(whatsappMessages.createdAt))
        .limit(20);

      return records as unknown as WhatsAppMessage[];
    } catch {
      return [];
    }
  }
}

export const whatsappRepository = new WhatsAppRepository();
