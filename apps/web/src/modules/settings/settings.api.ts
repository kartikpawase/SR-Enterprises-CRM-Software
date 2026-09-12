import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type {
  SettingsCategory,
  AllSettingsResponse,
  PublicSettingsResponse,
  SystemSettings,
  BusinessSettings,
  TaxSettings,
  InvoiceSettings,
  PaymentSettings,
  SalesSettings,
  ServiceSettings,
  JobCardSettings,
  WarrantySettings,
  InventorySettings,
  NotificationSettings,
  NumberingSettings,
  SecuritySettings,
} from '@crm/types';

export const settingsKeys = {
  all: ['settings'] as const,
  category: (category: SettingsCategory) => [...settingsKeys.all, 'category', category] as const,
  public: () => [...settingsKeys.all, 'public'] as const,
  auditLogs: () => [...settingsKeys.all, 'auditLogs'] as const,
  health: () => [...settingsKeys.all, 'health'] as const,
};

export interface SettingsAuditLogItem {
  id: string;
  actorId: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: Record<string, any> | null;
  afterState: Record<string, any> | null;
  changeReason?: string | null;
  timestamp: string;
}

/**
 * Fetch all configuration categories
 */
export function useAllSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async () => {
      const response = await apiClient.get<AllSettingsResponse>('/settings');
      return response.data;
    },
    staleTime: 60000,
  });
}

/**
 * Fetch a specific configuration category
 */
export function useCategorySettingsQuery<T = any>(category: SettingsCategory) {
  return useQuery({
    queryKey: settingsKeys.category(category),
    queryFn: async () => {
      const response = await apiClient.get<{
        category: SettingsCategory;
        value: T;
        version: number;
      }>(`/settings/${category.toLowerCase()}`);
      return response.data;
    },
    staleTime: 30000,
  });
}

/**
 * Fetch public branding and localization settings
 */
export function usePublicSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.public(),
    queryFn: async () => {
      const response = await apiClient.get<PublicSettingsResponse>('/settings/public');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update a configuration category with optimistic locking & audit logging
 */
export function useUpdateSettingsMutation<T = any>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      category,
      data,
      expectedVersion,
    }: {
      category: SettingsCategory;
      data: Partial<T>;
      expectedVersion?: number;
    }) => {
      const response = await apiClient.patch<{
        success: boolean;
        message: string;
        data: T;
        version: number;
      }>(`/settings/${category.toLowerCase()}`, {
        data,
        expectedVersion,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.category(variables.category) });
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.public() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.auditLogs() });
    },
  });
}

/**
 * Reset a configuration category to system defaults
 */
export function useResetSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ category }: { category: SettingsCategory }) => {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
        version: number;
      }>(`/settings/${category.toLowerCase()}/reset`, {
        confirmation: 'RESET',
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.category(variables.category) });
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.public() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.auditLogs() });
    },
  });
}

/**
 * Fetch settings change audit trail records
 */
export function useSettingsAuditLogsQuery() {
  return useQuery({
    queryKey: settingsKeys.auditLogs(),
    queryFn: async () => {
      const response = await apiClient.get<SettingsAuditLogItem[]>('/settings/audit-logs');
      return response.data || [];
    },
    staleTime: 10000,
  });
}
