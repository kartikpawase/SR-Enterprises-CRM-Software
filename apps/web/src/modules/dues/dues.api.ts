import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export interface DueServiceItem {
  id: string;
  serviceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerNumber: string;
  serviceType: string;
  serviceLocation: string;
  serviceClassification: string;
  machineModel: string;
  machineSerialNumber?: string | null;
  scheduledDate: string;
  scheduledTimeSlot?: string | null;
  technicianId?: string | null;
  technicianName?: string | null;
  technicianPhone?: string | null;
  status: string;
  priority: string;
  customerNotes?: string | null;
  internalNotes?: string | null;
  address?: string | null;
  jobCardNumber?: string | null;
}

export interface DueRentalItem {
  id: string;
  rentalNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerNumber: string;
  machineModel: string;
  machineType: string;
  serialNumber: string;
  monthlyRent: string;
  billingAmount: string;
  outstandingAmount: string;
  nextDueDate: string;
  rentalStatus: string;
  paymentStatus: string;
  billingFrequency: string;
  installationAddress?: string | null;
  notes?: string | null;
}

export interface DueOtherActivityItem {
  id: string;
  activityType: 'REMINDER' | 'INVOICE_DUE' | 'WARRANTY_SCHEDULE';
  title: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerNumber: string;
  date: string;
  status: string;
  priority?: string | null;
  amount?: string | null;
  details?: string | null;
  referenceId?: string | null;
  referenceNumber?: string | null;
}

export interface DuesDateResult {
  selectedDate: string;
  summary: {
    totalActivities: number;
    servicesCount: number;
    doorstepVisitsCount: number;
    rentalPaymentsCount: number;
    otherActivitiesCount: number;
  };
  services: DueServiceItem[];
  doorstepVisits: DueServiceItem[];
  rentalPayments: DueRentalItem[];
  otherActivities: DueOtherActivityItem[];
}

export interface MonthSummaryResult {
  year: number;
  month: number;
  counts: Record<string, number>;
}

export const duesKeys = {
  all: ['dues'] as const,
  date: (date: string) => [...duesKeys.all, 'date', date] as const,
  month: (year: number, month: number) => [...duesKeys.all, 'month', year, month] as const,
};

export function useDuesQuery(date: string) {
  return useQuery({
    queryKey: duesKeys.date(date),
    queryFn: async () => {
      const response = await apiClient.get<DuesDateResult>(`/dues?date=${date}`);
      return response.data;
    },
    enabled: Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date)),
  });
}

export function useDuesMonthSummaryQuery(year: number, month: number) {
  return useQuery({
    queryKey: duesKeys.month(year, month),
    queryFn: async () => {
      const response = await apiClient.get<MonthSummaryResult>(
        `/dues/month-summary?year=${year}&month=${month}`
      );
      return response.data;
    },
    enabled: Boolean(year && month),
  });
}
