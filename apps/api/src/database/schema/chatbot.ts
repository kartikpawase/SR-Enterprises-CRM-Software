import { pgTable, uuid, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Chatbot Knowledge Table
 * Authoritative admin-trained knowledge entries for SR Enterprises CRM.
 */
export const chatbotKnowledge = pgTable(
  'chatbot_knowledge',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').default(''),
    category: text('category').default(''),
    question: text('question').default(''),
    answer: text('answer').default(''),
    isActive: boolean('is_active').default(true).notNull(),
    isPublished: boolean('is_published').default(true).notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('chatbot_knowledge_category_idx').on(table.category),
    isActiveIdx: index('chatbot_knowledge_is_active_idx').on(table.isActive),
    isPublishedIdx: index('chatbot_knowledge_is_published_idx').on(table.isPublished),
  })
);

/**
 * Chatbot Conversations Table
 */
export const chatbotConversations = pgTable(
  'chatbot_conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').default('New Conversation').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('chatbot_conversations_user_id_idx').on(table.userId),
  })
);

/**
 * Chatbot Messages Table
 */
export const chatbotMessages = pgTable(
  'chatbot_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => chatbotConversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'user' | 'assistant'
    content: text('content').notNull(),
    sources: jsonb('sources'), // Array of ChatbotSourceItem
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index('chatbot_messages_conversation_id_idx').on(table.conversationId),
  })
);
