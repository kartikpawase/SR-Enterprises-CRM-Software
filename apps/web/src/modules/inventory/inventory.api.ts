import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  brand?: string | null;
  partNumber?: string | null;
  description?: string | null;
  purchasePrice: string | number;
  sellingPrice: string | number;
  currentStock: number;
  minStockLevel: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryPurchase {
  id: string;
  purchaseNumber: string;
  itemId: string;
  itemName?: string;
  category?: string;
  brand?: string | null;
  partNumber?: string | null;
  supplierName?: string | null;
  purchaseDate: string;
  quantity: number;
  remainingQuantity: number;
  purchasePricePerUnit: string | number;
  totalAmount: string | number;
  notes?: string | null;
  createdAt: string;
}

export interface InventorySale {
  id: string;
  saleNumber: string;
  itemId: string;
  itemName?: string;
  category?: string;
  brand?: string | null;
  partNumber?: string | null;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  saleDate: string;
  quantity: number;
  sellingPricePerUnit: string | number;
  purchaseCostPerUnit: string | number;
  totalSaleAmount: string | number;
  totalCostAmount: string | number;
  profit: string | number;
  paymentStatus: string;
  notes?: string | null;
  createdAt: string;
}

export interface InventoryAnalytics {
  period: string;
  startDate: string;
  endDate: string;
  kpis: {
    totalSales: number;
    totalPurchases: number;
    totalCostOfGoodsSold: number;
    netProfit: number;
    grossMarginPercent: number;
    totalQtySold: number;
    totalQtyPurchased: number;
    salesTransactionCount: number;
    purchaseTransactionCount: number;
    totalActiveItems: number;
    totalStockQuantity: number;
    currentStockValuation: number;
    lowStockItemsCount: number;
  };
  topSellingItems: Array<{
    itemId: string;
    name: string;
    category: string;
    totalQuantitySold: number;
    totalRevenue: string;
    totalProfit: string;
  }>;
  topProfitableItems: Array<{
    itemId: string;
    name: string;
    category: string;
    totalQuantitySold: number;
    totalProfit: string;
    marginPercent: number;
  }>;
  lowStockAlerts: Array<{
    id: string;
    name: string;
    category: string;
    brand?: string | null;
    currentStock: number;
    minStockLevel: number;
  }>;
  dailySeries: Array<{
    date: string;
    sales: number;
    costs: number;
    profit: number;
  }>;
}

export interface ProfitLedgerRow {
  id: string;
  saleNumber: string;
  saleDate: string;
  itemId: string;
  itemName: string;
  category: string;
  brand?: string | null;
  partNumber?: string | null;
  customerName: string;
  quantity: number;
  purchaseCostPerUnit: number;
  sellingPricePerUnit: number;
  totalCostAmount: number;
  totalSaleAmount: number;
  profit: number;
  marginPercent: number;
}

// =========================================================================
// QUERY HOOKS
// =========================================================================

export function useInventoryItemsQuery(filters: {
  search?: string;
  category?: string;
  status?: string;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['inventory', 'items', filters],
    queryFn: async () => {
      const res = await apiClient.get<any>('/inventory-management/items', { params: filters });
      const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return {
        data: raw as InventoryItem[],
        pagination: (res as any)?.pagination || { page: 1, limit: 50, total: raw.length, totalPages: 1 },
      };
    },
  });
}

export function useInventoryItemDetailQuery(id?: string) {
  return useQuery({
    queryKey: ['inventory', 'item', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<any>(`/inventory-management/items/${id}`);
      return (res?.data || res) as (InventoryItem & {
        recentPurchases: InventoryPurchase[];
        recentSales: InventorySale[];
      });
    },
    enabled: !!id,
  });
}

export function useInventoryPurchasesQuery(filters: {
  itemId?: string;
  supplierName?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['inventory', 'purchases', filters],
    queryFn: async () => {
      const res = await apiClient.get<any>('/inventory-management/purchases', { params: filters });
      const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return {
        data: raw as InventoryPurchase[],
        pagination: (res as any)?.pagination || { page: 1, limit: 50, total: raw.length, totalPages: 1 },
      };
    },
  });
}

export function useInventorySalesQuery(filters: {
  itemId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['inventory', 'sales', filters],
    queryFn: async () => {
      const res = await apiClient.get<any>('/inventory-management/sales', { params: filters });
      const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return {
        data: raw as InventorySale[],
        pagination: (res as any)?.pagination || { page: 1, limit: 50, total: raw.length, totalPages: 1 },
      };
    },
  });
}

export function useInventoryAnalyticsQuery(filters: {
  period: 'today' | 'week' | 'month' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['inventory', 'analytics', filters],
    queryFn: async () => {
      const res = await apiClient.get<any>('/inventory-management/analytics', { params: filters });
      return (res?.data || res) as InventoryAnalytics;
    },
  });
}

export function useInventoryProfitLedgerQuery(filters: {
  period?: 'today' | 'week' | 'month' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  itemId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['inventory', 'profit-ledger', filters],
    queryFn: async () => {
      const res = await apiClient.get<any>('/inventory-management/profit-ledger', { params: filters });
      const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return {
        data: raw as ProfitLedgerRow[],
        pagination: (res as any)?.pagination || { page: 1, limit: 50, total: raw.length, totalPages: 1 },
      };
    },
  });
}

// =========================================================================
// MUTATION HOOKS
// =========================================================================

export function useCreateInventoryItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      category: string;
      brand?: string;
      partNumber?: string;
      description?: string;
      purchasePrice: number;
      sellingPrice: number;
      initialStock?: number;
      minStockLevel?: number;
      status?: string;
    }) => {
      const res = await apiClient.post<{ success: boolean; data: InventoryItem }>(
        '/inventory-management/items',
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateInventoryItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      category?: string;
      brand?: string;
      partNumber?: string;
      description?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      minStockLevel?: number;
      status?: string;
    }) => {
      const res = await apiClient.put<{ success: boolean; data: InventoryItem }>(
        `/inventory-management/items/${id}`,
        payload
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'item', variables.id] });
    },
  });
}

export function useCreatePurchaseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      itemId: string;
      supplierName?: string;
      purchaseDate: string;
      quantity: number;
      purchasePricePerUnit: number;
      notes?: string;
    }) => {
      const res = await apiClient.post<{ success: boolean; data: InventoryPurchase }>(
        '/inventory-management/purchases',
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useCreateSaleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      itemId: string;
      customerId?: string;
      customerName: string;
      customerPhone?: string;
      saleDate: string;
      quantity: number;
      sellingPricePerUnit: number;
      paymentStatus?: string;
      notes?: string;
    }) => {
      const res = await apiClient.post<{ success: boolean; data: InventorySale }>(
        '/inventory-management/sales',
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
