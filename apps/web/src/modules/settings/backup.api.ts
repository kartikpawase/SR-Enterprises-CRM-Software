import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { API_PREFIX } from '@crm/shared';
import type {
  BackupManifestDTO,
  BackupStorageEstimate,
  CreateBackupRequest,
  RestoreBackupRequest,
  RestoreResult,
} from '@crm/types';

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY';
  time: string;
  retentionCount: number;
  lastRunTime?: string | null;
}

export type BackupItem = BackupManifestDTO & { filename: string };

export const backupKeys = {
  all: ['backups'] as const,
  list: (params?: { page?: number; limit?: number; type?: string }) =>
    [...backupKeys.all, 'list', params] as const,
  schedule: () => [...backupKeys.all, 'schedule'] as const,
  estimate: () => [...backupKeys.all, 'estimate'] as const,
};

/**
 * Fetch all backups with pagination
 */
export function useBackupsQuery(params?: { page?: number; limit?: number; type?: string }) {
  return useQuery({
    queryKey: backupKeys.list(params),
    queryFn: async () => {
      const response = await apiClient.get<BackupItem[]>('/backups', {
        params: {
          page: params?.page || 1,
          limit: params?.limit || 50,
          type: params?.type,
        },
      });
      return response.data || [];
    },
    staleTime: 10000,
  });
}

/**
 * Fetch backup storage estimate
 */
export function useBackupStorageEstimateQuery() {
  return useQuery({
    queryKey: backupKeys.estimate(),
    queryFn: async () => {
      const response = await apiClient.get<BackupStorageEstimate>('/backups/storage/estimate');
      return response.data;
    },
    staleTime: 30000,
  });
}

/**
 * Fetch backup schedule configuration
 */
export function useBackupScheduleQuery() {
  return useQuery({
    queryKey: backupKeys.schedule(),
    queryFn: async () => {
      const response = await apiClient.get<BackupScheduleConfig>('/backups/schedule');
      return response.data;
    },
  });
}

/**
 * Update backup schedule configuration
 */
export function useUpdateBackupScheduleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<BackupScheduleConfig>) => {
      const response = await apiClient.put<BackupScheduleConfig>('/backups/schedule', config);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.schedule() });
    },
  });
}

/**
 * Trigger manual full backup creation
 */
export function useCreateBackupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: CreateBackupRequest = {}) => {
      const response = await apiClient.post<BackupManifestDTO>('/backups', req);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.all });
    },
  });
}

/**
 * Verify cryptographic checksum of a backup
 */
export function useVerifyBackupMutation() {
  return useMutation({
    mutationFn: async (backupId: string) => {
      const response = await apiClient.post<{ valid: boolean; checksum: string; errors: string[] }>(
        `/backups/${encodeURIComponent(backupId)}/verify`
      );
      return response.data;
    },
  });
}

/**
 * Execute safe staged disaster recovery & restore
 */
export function useRestoreBackupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, req }: { id: string; req: RestoreBackupRequest }) => {
      const response = await apiClient.post<RestoreResult>(
        `/backups/${encodeURIComponent(id)}/restore`,
        req
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Invalidate all cached data on restore
    },
  });
}

/**
 * Delete a non-protected backup
 */
export function useDeleteBackupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<{ id: string; deleted: boolean }>(
        `/backups/${encodeURIComponent(id)}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.list() });
    },
  });
}

/**
 * Trigger authenticated browser download for backup archive
 */
export function triggerBackupDownload(backupId: string, filename?: string) {
  const downloadUrl = `${API_PREFIX}/backups/${encodeURIComponent(backupId)}/download`;
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename || `${backupId}.srmbackup`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
