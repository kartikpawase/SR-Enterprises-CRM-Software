import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type {
  NotificationItem,
  NotificationPreferences,
  NotificationQueryFilter,
  UnreadNotificationCountResponse,
} from '@crm/types';
import type { UpdateNotificationPreferencesInput } from '@crm/validation';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filter: NotificationQueryFilter) => [...notificationKeys.all, 'list', filter] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

// Local-First Fallback Notifications
const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Service Due: Industrial RO Unit #RO-9821',
    message: 'Periodic RO filter replacement scheduled for Apex Industries is due today.',
    severity: 'WARNING',
    notificationType: 'SERVICE_DUE',
    entityType: 'SERVICE',
    entityId: 'srv-001',
    actionUrl: '/services',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    title: 'Payment Received: ₹6,000',
    message: 'Payment received against Invoice #INV-2026-0089 via UPI from Rajesh Deshmukh.',
    severity: 'SUCCESS',
    notificationType: 'PAYMENT_RECEIVED',
    entityType: 'PAYMENT',
    entityId: 'pay-001',
    actionUrl: '/payments',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    title: 'New Website Inquiry Received',
    message: 'Priya Deshmukh submitted inquiry for Commercial RO System (50 LPH).',
    severity: 'INFO',
    notificationType: 'NEW_INQUIRY',
    entityType: 'INQUIRY',
    entityId: 'inq-001',
    actionUrl: '/inquiries',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    title: 'Warranty Expiry Warning',
    message: 'Machine warranty for Sunil Patil (Aqua Pro 25L) expires in 15 days.',
    severity: 'WARNING',
    notificationType: 'WARRANTY_EXPIRING',
    entityType: 'WARRANTY',
    entityId: 'war-001',
    actionUrl: '/warranties',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export function useNotificationsQuery(filter: NotificationQueryFilter = {}) {
  return useQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: async () => {
      try {
        const response = await apiClient.get<{
          data: NotificationItem[];
          total: number;
          page: number;
          limit: number;
        }>('/notifications', {
          params: {
            page: filter.page || 1,
            limit: filter.limit || 20,
            isRead: filter.isRead,
            severity: filter.severity,
            notificationType: filter.notificationType,
            entityType: filter.entityType,
            search: filter.search,
          },
        });
        return response.data;
      } catch (err) {
        console.warn('Backend notifications unavailable, using local-first fallback', err);
        return {
          data: FALLBACK_NOTIFICATIONS,
          total: FALLBACK_NOTIFICATIONS.length,
          page: 1,
          limit: 20,
        };
      }
    },
    refetchInterval: 30000, // Poll every 30s in foreground
  });
}

export function useUnreadNotificationCountQuery() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      try {
        const response = await apiClient.get<UnreadNotificationCountResponse>('/notifications/unread-count');
        return response.data;
      } catch (err) {
        console.warn('Backend notifications count unavailable, using local count', err);
        const unread = FALLBACK_NOTIFICATIONS.filter((n) => !n.isRead).length;
        return {
          unreadCount: unread,
          criticalCount: 0,
          warningCount: 1,
        };
      }
    },
    refetchInterval: 15000, // Frequent badge poll
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/notifications/${id}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: async () => {
      const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
      return response.data;
    },
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateNotificationPreferencesInput) => {
      const response = await apiClient.put<NotificationPreferences>('/notifications/preferences', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences });
    },
  });
}

export function useSendAdminTestEmailMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetEmail?: string) => {
      const response = await apiClient.post<{
        success: boolean;
        message?: string;
        error?: string;
        recipient?: string;
        messageId?: string;
      }>('/notifications/email/test', { targetEmail });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useEmailHistoryQuery(params: { page?: number; limit?: number; status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ['notifications', 'email-history', params],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>('/notifications/email/history', { params });
      return res.data;
    },
  });
}

export function useTriggerEmailCronMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ success: boolean; data?: any }>('/notifications/email/cron');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

