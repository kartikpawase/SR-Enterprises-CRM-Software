import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type {
  ChatbotKnowledge,
  CreateChatbotKnowledgeInput,
  UpdateChatbotKnowledgeInput,
  ChatbotResponse,
  ChatbotMessageItem,
} from '@crm/types';

export const chatbotKeys = {
  all: ['chatbot'] as const,
  knowledge: (params?: { search?: string; category?: string; isActive?: string }) =>
    [...chatbotKeys.all, 'knowledge', params] as const,
  conversation: (id?: string) => [...chatbotKeys.all, 'conversation', id] as const,
};

/**
 * Fetch trained chatbot knowledge list with filters
 */
export function useChatbotKnowledgeQuery(params?: {
  search?: string;
  category?: string;
  isActive?: 'true' | 'false' | 'all';
}) {
  return useQuery({
    queryKey: chatbotKeys.knowledge(params),
    queryFn: async () => {
      const response = await apiClient.get<ChatbotKnowledge[]>('/chatbot/knowledge', {
        params: {
          search: params?.search || undefined,
          category: params?.category || undefined,
          isActive: params?.isActive || undefined,
          limit: 100,
        },
      });
      return response.data || [];
    },
    staleTime: 10000,
  });
}

/**
 * Create a new knowledge entry
 */
export function useCreateKnowledgeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateChatbotKnowledgeInput) => {
      const res = await apiClient.post<ChatbotKnowledge>('/chatbot/knowledge', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotKeys.all });
    },
  });
}

/**
 * Update an existing knowledge entry
 */
export function useUpdateKnowledgeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateChatbotKnowledgeInput }) => {
      const res = await apiClient.put<ChatbotKnowledge>(`/chatbot/knowledge/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotKeys.all });
    },
  });
}

/**
 * Delete a knowledge entry
 */
export function useDeleteKnowledgeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ success: boolean }>(`/chatbot/knowledge/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotKeys.all });
    },
  });
}

/**
 * Publish all active knowledge updates to the live chatbot
 */
export function usePublishKnowledgeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ publishedCount: number }>('/chatbot/knowledge/publish');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotKeys.all });
    },
  });
}

/**
 * Send user message to the chatbot
 */
export function useChatMutation() {
  return useMutation({
    mutationFn: async (payload: { message: string; conversationId?: string }) => {
      const res = await apiClient.post<ChatbotResponse>('/chatbot/chat', payload);
      return res.data;
    },
  });
}

/**
 * Fetch messages for a conversation
 */
export function useConversationMessagesQuery(conversationId?: string) {
  return useQuery({
    queryKey: chatbotKeys.conversation(conversationId),
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await apiClient.get<ChatbotMessageItem[]>(
        `/chatbot/conversations/${conversationId}/messages`
      );
      return res.data || [];
    },
    enabled: !!conversationId,
  });
}
