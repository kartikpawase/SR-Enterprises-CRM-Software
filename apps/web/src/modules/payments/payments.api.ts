import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type {
  PaymentQueryFilter,
  CreatePaymentInput,
  CancelPaymentInput,
  RefundPaymentInput,
} from '@crm/validation';

export interface PaymentItem {
  id: string;
  paymentNumber: string;
  amount: string;
  paymentDate: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Invoice details
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: string;
  invoiceStatus: string;
  invoiceDate?: string;
  dueDate: string;
  // Customer details
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNumber: string;
  // Collector / Received By
  receivedById?: string;
  receivedByName?: string;
}

export interface PaymentKPIs {
  totalCollected: number;
  todayCollected: number;
  totalInvoiced: number;
  totalOutstanding: number;
  completedPaymentsCount: number;
  pendingPaymentsCount: number;
  overdueInvoicesCount: number;
}

export interface CustomerFinancialSummary {
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueAmount: number;
  recentPayments: Array<{
    id: string;
    paymentNumber: string;
    amount: string;
    paymentDate: string;
    paymentMethod: string;
    status: string;
    invoiceNumber: string;
  }>;
}

export function usePaymentKPIs() {
  return useQuery({
    queryKey: ['payments', 'kpis'],
    queryFn: async () => {
      const response = await apiClient.get<PaymentKPIs>('/payments/kpis');
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
  });
}

export function usePayments(filters: Partial<PaymentQueryFilter> = {}) {
  return useQuery({
    queryKey: ['payments', 'list', filters],
    queryFn: async () => {
      const response = await apiClient.get<any>('/payments', { params: filters });
      return (response as any)?.data?.data ? (response as any).data : response;
    },
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', 'detail', id],
    queryFn: async () => {
      const response = await apiClient.get<PaymentItem>(`/payments/${id}`);
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    enabled: Boolean(id),
  });
}

export function useInvoicePayments(invoiceId: string) {
  return useQuery({
    queryKey: ['payments', 'invoice', invoiceId],
    queryFn: async () => {
      const response = await apiClient.get<PaymentItem[]>(
        `/payments/invoice/${invoiceId}`
      );
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    enabled: Boolean(invoiceId),
  });
}

export function useCustomerFinancialSummary(customerId: string) {
  return useQuery({
    queryKey: ['customers', customerId, 'financial-summary'],
    queryFn: async () => {
      const response = await apiClient.get<CustomerFinancialSummary>(
        `/payments/customer/${customerId}/summary`
      );
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    enabled: Boolean(customerId),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePaymentInput) => {
      const response = await apiClient.post<{ success: boolean; data: any }>('/payments', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CancelPaymentInput }) => {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        `/payments/${id}/cancel`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: RefundPaymentInput }) => {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        `/payments/${id}/refund`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
