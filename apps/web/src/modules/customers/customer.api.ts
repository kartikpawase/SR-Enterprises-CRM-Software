import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, resolveApiUrl } from '../../lib/api-client';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryFilterInput,
  CheckDuplicateCustomerInput,
} from '@crm/validation';

export interface CustomerAddress {
  id: string;
  customerId: string;
  addressType: 'BILLING' | 'SERVICE' | 'BOTH';
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export interface CustomerSummary {
  id: string;
  customerNumber: string;
  fullName: string;
  phone: string;
  email?: string | null;
  customerType: 'INDIVIDUAL' | 'COMMERCIAL';
  companyName?: string | null;
  gstNumber?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  customerLabel?: 'GOOD' | 'BAD' | null;
  customLabelId?: string | null;
  customLabel?: CustomLabelDefinition | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  addresses?: CustomerAddress[];
  assets?: Array<{ id: string; assetType: string; status: string }>;
}

export interface CustomLabelDefinition {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerFinancialSummary {
  customerId: string;
  totalBilled: string;
  totalPaid: string;
  outstanding: string;
  overdue: string;
  paymentHealth: 'ALL_PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'NO_INVOICES';
  lastPaymentDate: string | null;
  lastPaymentAmount: string | null;
  lastPaymentMethod: string | null;
}

export interface CustomerAssetItem {
  id: string;
  assetType: 'RO_MACHINE' | 'SPARE_PART';
  serialNumber?: string | null;
  customName?: string | null;
  productName?: string | null;
  productSku?: string | null;
  productBrand?: string | null;
  purchaseDate?: string | null;
  installationDate?: string | null;
  status: 'ACTIVE' | 'IN_SERVICE' | 'REPLACED' | 'DECOMMISSIONED';
  product?: {
    name: string;
    model?: string | null;
    brand?: string | null;
    sku: string;
  } | null;
  warranties?: Array<{
    id: string;
    status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'VOID';
    startDate: string;
    endDate: string;
    warrantyType: string;
  }>;
}

export interface CustomerActivityItem {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  description: string;
  actorName?: string | null;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newThisMonth: number;
  withWarranty: number;
  dueForService: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export const CUSTOMER_QUERY_KEYS = {
  all: ['customers'] as const,
  stats: () => [...CUSTOMER_QUERY_KEYS.all, 'stats'] as const,
  list: (filters: CustomerQueryFilterInput) => [...CUSTOMER_QUERY_KEYS.all, 'list', filters] as const,
  detail: (id: string) => [...CUSTOMER_QUERY_KEYS.all, 'detail', id] as const,
  financial: (id: string) => [...CUSTOMER_QUERY_KEYS.all, 'financial', id] as const,
  assets: (id: string) => [...CUSTOMER_QUERY_KEYS.all, 'assets', id] as const,
  activities: (id: string, page?: number) => [...CUSTOMER_QUERY_KEYS.all, 'activities', id, page] as const,
  sales: (id: string, page?: number) => [...CUSTOMER_QUERY_KEYS.all, 'sales', id, page] as const,
  invoices: (id: string, page?: number) => [...CUSTOMER_QUERY_KEYS.all, 'invoices', id, page] as const,
  payments: (id: string, page?: number) => [...CUSTOMER_QUERY_KEYS.all, 'payments', id, page] as const,
  services: (id: string, page?: number) => [...CUSTOMER_QUERY_KEYS.all, 'services', id, page] as const,
  warranties: (id: string) => [...CUSTOMER_QUERY_KEYS.all, 'warranties', id] as const,
  jobCards: (id: string, page?: number) => [...CUSTOMER_QUERY_KEYS.all, 'job-cards', id, page] as const,
};

/**
 * Fetch customer dashboard summary metrics with baseline isolation
 */
export function useCustomerStatsQuery() {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.stats(),
    queryFn: async () => {
      const res = await apiClient.get<CustomerStats>('/customers/stats');
      return (res?.data || res) as unknown as CustomerStats;
    },
    refetchOnMount: 'always',
    staleTime: 5000,
  });
}

/**
 * Fetch paginated customers directory
 */
export function useCustomersQuery(filters: CustomerQueryFilterInput) {
  const effectiveFilters: CustomerQueryFilterInput = {
    sortBy: 'customerNumber',
    sortOrder: 'asc',
    ...filters,
  };

  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.list(effectiveFilters),
    queryFn: async () => {
      const res = await apiClient.get<CustomerSummary[]>('/customers', {
        params: effectiveFilters as Record<string, string | number | boolean | undefined>,
      });
      return res as unknown as PaginatedResponse<CustomerSummary>;
    },
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

/**
 * Fetch single customer profile
 */
export function useCustomerDetailQuery(id?: string) {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.detail(id || ''),
    queryFn: async () => {
      const res = await apiClient.get<CustomerSummary>(`/customers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch customer financial summary
 */
export function useCustomerFinancialSummaryQuery(id?: string) {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.financial(id || ''),
    queryFn: async () => {
      const res = await apiClient.get<CustomerFinancialSummary>(`/customers/${id}/financial-summary`);
      return res.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch customer assets
 */
export function useCustomerAssetsQuery(id?: string) {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.assets(id || ''),
    queryFn: async () => {
      const res = await apiClient.get<CustomerAssetItem[]>(`/customers/${id}/assets`);
      return res.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch customer activities timeline
 */
export function useCustomerActivitiesQuery(id?: string, page = 1) {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.activities(id || '', page),
    queryFn: async () => {
      const res = await apiClient.get<CustomerActivityItem[]>(`/customers/${id}/activities`, {
        params: { page, limit: 50 },
      });
      return res as unknown as PaginatedResponse<CustomerActivityItem>;
    },
    enabled: !!id,
  });
}

/**
 * Check duplicate customer helper
 */
export async function checkCustomerDuplicateApi(input: CheckDuplicateCustomerInput) {
  const res = await apiClient.get<{
    isDuplicate: boolean;
    matchField: string | null;
    existingCustomer: CustomerSummary | null;
  }>('/customers/check-duplicate', {
    params: input as Record<string, string | number | boolean | undefined>,
  });
  return res.data;
}

/**
 * Create customer mutation
 */
export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const res = await apiClient.post<CustomerSummary>('/customers', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
      queryClient.refetchQueries({ queryKey: CUSTOMER_QUERY_KEYS.all, type: 'active' });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['global-search'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp'] });
    },
  });
}

/**
 * Update customer mutation
 */
export function useUpdateCustomerMutation(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateCustomerInput) => {
      const res = await apiClient.patch<CustomerSummary>(`/customers/${customerId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
      queryClient.refetchQueries({ queryKey: CUSTOMER_QUERY_KEYS.all, type: 'active' });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['global-search'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export type UpdateCustomerLabelPayload =
  | 'GOOD'
  | 'BAD'
  | null
  | {
      label?: 'GOOD' | 'BAD' | 'CUSTOM' | 'NONE' | null;
      customLabelId?: string | null;
      newCustomLabel?: {
        name: string;
        color: string;
        description?: string | null;
      };
    };

/**
 * Update customer label mutation
 */
export function useUpdateCustomerLabelMutation(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateCustomerLabelPayload) => {
      let body: any;
      if (typeof payload === 'string' || payload === null) {
        body = { label: payload ?? 'NONE' };
      } else {
        body = payload;
      }
      const res = await apiClient.patch<CustomerSummary>(`/customers/${customerId}/label`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['custom-labels'] });
      queryClient.refetchQueries({ queryKey: CUSTOMER_QUERY_KEYS.all, type: 'active' });
    },
  });
}

/**
 * Query hook for all custom labels
 */
export function useCustomLabelsQuery() {
  return useQuery({
    queryKey: ['custom-labels'],
    queryFn: async () => {
      const res = await apiClient.get<CustomLabelDefinition[]>('/customers/custom-labels');
      return res.data || [];
    },
    staleTime: 30000,
  });
}

/**
 * Mutation hook to create a custom label definition
 */
export function useCreateCustomLabelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; color: string; description?: string | null }) => {
      const res = await apiClient.post<CustomLabelDefinition>('/customers/custom-labels', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-labels'] });
    },
  });
}

/**
 * Mutation hook to update a custom label definition
 */
export function useUpdateCustomLabelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; color?: string; description?: string | null } }) => {
      const res = await apiClient.put<CustomLabelDefinition>(`/customers/custom-labels/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-labels'] });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
    },
  });
}

/**
 * Archive customer mutation
 */
export function useArchiveCustomerMutation(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reason?: string) => {
      const res = await apiClient.post<CustomerSummary>(`/customers/${customerId}/archive`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['global-search'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hard delete customer mutation (permanently removes customer and all records from CRM)
 */
export function useDeleteCustomerMutation(customerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (overrideId?: string) => {
      const targetId = overrideId || customerId;
      if (!targetId) throw new Error('Customer ID is required for deletion');
      const res = await apiClient.delete<{ success: boolean; data: any }>(`/customers/${targetId}`);
      return res.data;
    },
    onSuccess: (_, variables) => {
      const targetId = variables || customerId;
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
      if (targetId) {
        queryClient.removeQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(targetId) });
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['global-search'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Clear customer operational data mutation (sales, invoices, payments, services, warranties, assets)
 * Keeps customer master profile intact with reset zero balances.
 */
export function useClearCustomerDataMutation(customerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (overrideId?: string) => {
      const targetId = overrideId || customerId;
      if (!targetId) throw new Error('Customer ID is required to clear data');
      const res = await apiClient.post<{ success: boolean; message: string; data: any }>(
        `/customers/${targetId}/clear-data`,
        {}
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      const targetId = variables || customerId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(targetId) });
        queryClient.invalidateQueries({ queryKey: ['customer-financial', targetId] });
      }
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Add customer note mutation
 */
export function useAddCustomerNoteMutation(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post<CustomerSummary>(`/customers/${customerId}/notes`, { content });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.activities(customerId) });
    },
  });
}

/**
 * Export customers dataset as CSV file download
 */
export async function exportCustomersApi(filters?: Partial<CustomerQueryFilterInput> & { status?: string; customerType?: string }) {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status && (filters.status as string) !== 'ALL') params.append('status', filters.status);
  if (filters?.customerType && (filters.customerType as string) !== 'ALL') params.append('customerType', filters.customerType);
  if (filters?.city && (filters.city as string) !== 'ALL') params.append('city', filters.city);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.sortBy) params.append('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
  params.append('format', 'csv');

  const queryString = params.toString();
  const url = `/data-movement/export/customers${queryString ? `?${queryString}` : ''}`;

  const targetUrl = resolveApiUrl(url);

  const response = await fetch(targetUrl, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to export customers dataset');
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `customers_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Import preview API
 */
export async function previewCustomerImportApi(data: string | Array<Record<string, any>>, filename?: string) {
  const res = await apiClient.post<any>('/data-movement/import/preview', {
    type: 'customer',
    data,
    filename,
  });
  return res.data;
}

/**
 * Import execute API
 */
export async function executeCustomerImportApi(records: Array<Record<string, any>>, duplicatePolicy = 'CREATE') {
  const res = await apiClient.post<any>('/data-movement/import/execute', {
    type: 'customer',
    records,
    duplicatePolicy,
  });
  return res.data;
}

