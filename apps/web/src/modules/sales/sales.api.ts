import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type {
  CreateSaleInput,
  UpdateSaleInput,
  ConfirmSaleInput,
  CancelSaleInput,
  SaleQueryFilter,
  ProductQueryFilter,
} from '@crm/validation';

export interface SaleItemData {
  id: string;
  saleId: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
  unitPriceSnapshot: string;
  discountAmount: string;
  taxRatePercent: string;
  taxAmount: string;
  lineTotal: string;
  warrantyMonths: number;
  serviceIntervalMonths: number;
  serialNumber?: string | null;
  nextServiceDate?: string | null;
}

export interface SaleSummaryData {
  id: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  customerPhone: string;
  saleDate: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  notes?: string | null;
  createdAt: string;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount?: string;
    paidAmount?: string;
    dueDate?: string | null;
    payments?: any[];
  } | null;
}

export interface SaleDetailData extends SaleSummaryData {
  customerEmail?: string | null;
  customerType?: string;
  items: SaleItemData[];
  payments?: Array<{
    id: string;
    paymentNumber: string;
    paymentDate: string;
    amount: string;
    paymentMethod: string;
    referenceNumber?: string | null;
    status: string;
    notes?: string | null;
  }>;
  assets?: {
    id: string;
    assetNumber: string;
    assetType: string;
    serialNumber?: string | null;
    customName?: string | null;
    status: string;
    purchaseDate: string;
  }[];
}

export interface ProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  productType: 'RO_MACHINE' | 'SPARE_PART';
  brand: string;
  model?: string | null;
  description?: string | null;
  unitPrice: string;
  taxRatePercent: string;
  defaultWarrantyMonths: number;
  defaultServiceIntervalMonths: number;
  isActive: boolean;
}

export interface SalesKpiData {
  totalSales: string;
  totalSalesRaw: number;
  totalSalesTrend: string;
  orders: number;
  ordersTrend: string;
  avgOrderValue: string;
  avgOrderTrend: string;
  completed: number;
  completedTrend: string;
  pending: number;
  pendingTrend: string;
}

export interface SalesStatsData {
  kpis: SalesKpiData;
  trend: Array<{ label: string; fullDate?: string; amount: number; count?: number }>;
  topProducts: Array<{ id: string; name: string; amount: string; percentage: number; type: 'ro' | 'filter' }>;
  recentSales: Array<{ id: string; customerName: string; amount: string; invoiceNo: string; time: string; iconVariant: 'emerald' | 'blue' }>;
  bottomWidgets: {
    fastMovingCount: number;
    pendingToday: number;
    totalCustomers: number;
    revenueTargetAchieved: number;
  };
}

export function useSalesQuery(filters: Partial<SaleQueryFilter>) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.productId) params.append('productId', filters.productId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.datePreset) params.append('datePreset', filters.datePreset);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const res = await apiClient.get<SaleSummaryData[]>(`/sales?${params.toString()}`);
      return {
        data: res.data || [],
        pagination: (res as any).pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    },
  });
}

export function useSalesStatsQuery(filters: Partial<SaleQueryFilter>) {
  return useQuery({
    queryKey: ['sales', 'stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.productId) params.append('productId', filters.productId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.datePreset) params.append('datePreset', filters.datePreset);

      const res = await apiClient.get<SalesStatsData>(`/sales/stats?${params.toString()}`);
      return res.data;
    },
  });
}

export function useSaleQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<SaleDetailData>(`/sales/${id}`);
      return res.data || null;
    },
    enabled: !!id,
  });
}

export function useProductsQuery(filters?: Partial<ProductQueryFilter>) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.productType) params.append('productType', filters.productType);
      if (filters?.brand) params.append('brand', filters.brand);

      const res = await apiClient.get<ProductCatalogItem[]>(`/products?${params.toString()}`);
      return res.data || [];
    },
  });
}

export function useCreateSaleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSaleInput) => {
      const res = await apiClient.post<SaleDetailData>('/sales', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useUpdateSaleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSaleInput }) => {
      const res = await apiClient.patch<SaleDetailData>(`/sales/${id}`, data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales', variables.id] });
    },
  });
}

export function useConfirmSaleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, confirmation }: { id: string; confirmation?: ConfirmSaleInput }) => {
      const res = await apiClient.post<SaleDetailData>(`/sales/${id}/confirm`, confirmation || {});
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useCancelSaleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CancelSaleInput }) => {
      const res = await apiClient.post<SaleDetailData>(`/sales/${id}/cancel`, data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteSaleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ success: boolean; message: string }>(`/sales/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
