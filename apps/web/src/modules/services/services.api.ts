import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type {
  ServiceQueryFilter,
  CreateServiceInput,
  UpdateServiceInput,
  CompleteServiceInput,
} from '@crm/validation';

export interface ServiceItem {
  id: string;
  serviceNumber: string;
  serviceType: 'INSTALLATION' | 'REPAIR' | 'PERIODIC_MAINTENANCE' | 'EMERGENCY' | 'SPARE_REPLACEMENT';
  serviceLocation: 'DOORSTEP' | 'IN_SHOP';
  serviceClassification: 'GENERAL' | 'WARRANTY';
  scheduledDate: string;
  scheduledTimeSlot: string | null;
  status: 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  customerNotes: string | null;
  internalNotes: string | null;
  completedAt: string | null;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerNumber: string;
  assetId: string;
  assetNumber: string;
  serialNumber: string | null;
  productName: string;
  productBrand: string | null;
  productSku: string;
  technicianId: string | null;
  technicianName: string | null;
  technicianPhone: string | null;
  warrantyId: string | null;
  warrantyStatus: string | null;
  warrantyEndDate: string | null;
  jobCardId: string | null;
  jobCardNumber: string | null;
  jobCardStatus: string | null;
  totalCharges?: string | number | null;
  paidAmount?: string;
  outstandingAmount?: string;
  paymentStatus?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | null;
  invoice?: any;
  payments?: any[];
}

export interface ServiceDetail extends ServiceItem {
  customerEmail: string | null;
  updatedAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  warrantyType: string | null;
  warrantyStartDate: string | null;
  problemReported: string | null;
  diagnosis: string | null;
  workPerformed: string | null;
  partsReplaced: any[] | null;
  technicianNotes: string | null;
  customerRemarks: string | null;
  laborCharges: string;
  partsCharges: string;
  totalCharges: string;
  jobCardCompletedAt: string | null;
}

export interface ServiceKPIs {
  totalServices: number;
  upcomingServices: number;
  warrantyServices: number;
  generalServices: number;
  completedServices: number;
  dueToday: number;
  overdueServices: number;
}

export interface HeatmapDayData {
  date_str: string;
  count: number;
  warranty_count: number;
  general_count: number;
  completed_count: number;
  pending_count: number;
  urgent_count: number;
}

export interface HeatmapResponse {
  period: 'year' | 'month' | 'week' | 'day';
  startDate: string;
  endDate: string;
  dailyData: HeatmapDayData[];
}

export interface TechnicianItem {
  id: string;
  name: string;
  phone: string;
  status: string;
  specialization: string | null;
}

export interface PaginatedServicesResponse {
  data: ServiceItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Hook to query paginated services list
 */
export function useServicesQuery(filters: Partial<ServiceQueryFilter>) {
  return useQuery({
    queryKey: ['services', filters],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedServicesResponse>('/services', {
        params: filters,
      });
      return (response as any)?.data?.data ? (response as any).data : response;
    },
    staleTime: 30_000,
  });
}

/**
 * Hook to query single service details
 */
export function useServiceDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get<ServiceDetail>(`/services/${id}`);
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to query operational service KPIs
 */
export function useServiceKPIsQuery() {
  return useQuery({
    queryKey: ['services', 'kpis'],
    queryFn: async () => {
      const response = await apiClient.get<ServiceKPIs>('/services/kpis');
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    staleTime: 60_000,
  });
}

/**
 * Hook to query GitHub-style Activity Heatmap
 */
export function useServiceHeatmapQuery(
  period: 'year' | 'month' | 'week' | 'day' = 'month',
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: ['services', 'heatmap', period, dateFrom, dateTo],
    queryFn: async () => {
      const response = await apiClient.get<HeatmapResponse>(
        '/services/heatmap',
        {
          params: { period, dateFrom, dateTo },
        }
      );
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    staleTime: 60_000,
  });
}

/**
 * Hook to query active technicians list
 */
export function useTechniciansQuery() {
  return useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await apiClient.get<TechnicianItem[]>(
        '/services/technicians'
      );
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    staleTime: 300_000,
  });
}

/**
 * Mutation to create/schedule a new service
 */
export function useCreateServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateServiceInput) => {
      const response = await apiClient.post<{ success: boolean; data: any }>('/services', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

/**
 * Mutation to update service details, reassign, or cancel
 */
export function useUpdateServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateServiceInput }) => {
      const response = await apiClient.patch<{ success: boolean; data: any }>(`/services/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service', variables.id] });
    },
  });
}

/**
 * Hook to query upcoming scheduled services (next N days)
 */
export function useUpcomingServicesQuery(days = 7) {
  return useQuery({
    queryKey: ['services', 'upcoming', days],
    queryFn: async () => {
      const response = await apiClient.get<ServiceItem[]>(
        '/services/upcoming',
        { params: { days } }
      );
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    staleTime: 60_000,
  });
}

/**
 * Hook to query overdue uncompleted services
 */
export function useOverdueServicesQuery() {
  return useQuery({
    queryKey: ['services', 'overdue'],
    queryFn: async () => {
      const response = await apiClient.get<ServiceItem[]>('/services/overdue');
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    staleTime: 60_000,
  });
}

/**
 * Mutation to mark service completed, update job card and schedule next recommendation
 */
export function useCompleteServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompleteServiceInput }) => {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        `/services/${id}/complete`,
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Mutation to cancel service with reason
 */
export function useCancelServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cancelReason }: { id: string; cancelReason: string }) => {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        `/services/${id}/cancel`,
        { cancelReason }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service', variables.id] });
    },
  });
}

/**
 * Mutation to manually trigger or retry WhatsApp notification to assigned technician
 */
export function useNotifyServiceTechnicianWhatsAppMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const response = await apiClient.post<{ success: boolean; message: string; data?: any }>(
        `/services/${serviceId}/notify-technician`
      );
      return ((response as any)?.data ?? response) as { success: boolean; message?: string; data?: any };
    },
    onSuccess: (_, serviceId) => {
      queryClient.invalidateQueries({ queryKey: ['service', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
    },
  });
}
