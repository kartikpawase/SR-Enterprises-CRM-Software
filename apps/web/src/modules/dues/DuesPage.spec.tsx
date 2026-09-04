import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DuesPage } from './DuesPage';
import * as duesApi from './dues.api';

// Create a query client for testing
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DuesPage Frontend Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Displays clean empty-state message when selected date has no activities', async () => {
    vi.spyOn(duesApi, 'useDuesQuery').mockReturnValue({
      data: {
        selectedDate: '2029-12-31',
        summary: {
          totalActivities: 0,
          servicesCount: 0,
          doorstepVisitsCount: 0,
          rentalPaymentsCount: 0,
          otherActivitiesCount: 0,
        },
        services: [],
        doorstepVisits: [],
        rentalPayments: [],
        otherActivities: [],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    vi.spyOn(duesApi, 'useDuesMonthSummaryQuery').mockReturnValue({
      data: { year: 2029, month: 12, counts: {} },
    } as any);

    renderWithProviders(<DuesPage />);

    expect(
      screen.getByText('No dues or scheduled activities for this date.')
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /All Activities/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Services/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Doorstep Visits/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Rental Payments/i })).toBeDefined();
  });

  it('2. Renders all 4 categories of activities when data exists for selected date', async () => {
    vi.spyOn(duesApi, 'useDuesQuery').mockReturnValue({
      data: {
        selectedDate: '2027-08-15',
        summary: {
          totalActivities: 4,
          servicesCount: 1,
          doorstepVisitsCount: 1,
          rentalPaymentsCount: 1,
          otherActivitiesCount: 1,
        },
        doorstepVisits: [
          {
            id: 'srv-1',
            serviceNumber: 'SRV-2027-001',
            customerId: 'cust-1',
            customerName: 'Amit Sharma',
            customerPhone: '9822001122',
            customerNumber: 'CUST-001',
            serviceType: 'PERIODIC_MAINTENANCE',
            serviceLocation: 'DOORSTEP',
            serviceClassification: 'GENERAL',
            machineModel: 'AquaGuard Royal RO',
            scheduledDate: '2027-08-15',
            scheduledTimeSlot: '10:00 AM - 12:00 PM',
            status: 'SCHEDULED',
            priority: 'HIGH',
            address: 'Flat 101, Shanti Heights, Kothrud, Pune',
          },
        ],
        services: [
          {
            id: 'srv-2',
            serviceNumber: 'SRV-2027-002',
            customerId: 'cust-2',
            customerName: 'Pooja Patil',
            customerPhone: '9822334455',
            customerNumber: 'CUST-002',
            serviceType: 'REPAIR',
            serviceLocation: 'IN_SHOP',
            serviceClassification: 'GENERAL',
            machineModel: 'Kent Grand Plus',
            scheduledDate: '2027-08-15',
            status: 'SCHEDULED',
            priority: 'NORMAL',
            customerNotes: 'Membrane replacement required',
          },
        ],
        rentalPayments: [
          {
            id: 'rnt-1',
            rentalNumber: 'RNT-2027-001',
            customerId: 'cust-3',
            customerName: 'Sanjay Deshmukh',
            customerPhone: '9890123456',
            customerNumber: 'CUST-003',
            machineModel: 'Commercial RO 50 LPH',
            machineType: 'COMMERCIAL',
            serialNumber: 'SN-COMM-50',
            monthlyRent: '2500.00',
            billingAmount: '2500.00',
            outstandingAmount: '2500.00',
            nextDueDate: '2027-08-15',
            rentalStatus: 'ACTIVE',
            paymentStatus: 'DUE',
            billingFrequency: 'MONTHLY',
          },
        ],
        otherActivities: [
          {
            id: 'rem-1',
            activityType: 'REMINDER',
            title: 'Annual Maintenance Follow-up',
            customerId: 'cust-4',
            customerName: 'Rajesh Kulkarni',
            customerPhone: '9850987654',
            customerNumber: 'CUST-004',
            date: '2027-08-15',
            status: 'PENDING',
            details: 'Call regarding contract renewal',
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    vi.spyOn(duesApi, 'useDuesMonthSummaryQuery').mockReturnValue({
      data: { year: 2027, month: 8, counts: { '2027-08-15': 4 } },
    } as any);

    renderWithProviders(<DuesPage />);

    // Check titles of sections
    expect(screen.getByText('Doorstep Visits & Field Jobs')).toBeDefined();
    expect(screen.getByText('Services & Workshop Activities')).toBeDefined();
    expect(screen.getByText('Rental Payment Dues')).toBeDefined();
    expect(screen.getByText('Other Scheduled Activities & Reminders')).toBeDefined();

    // Check specific records
    expect(screen.getByText('Amit Sharma')).toBeDefined();
    expect(screen.getByText('Flat 101, Shanti Heights, Kothrud, Pune')).toBeDefined();
    expect(screen.getByText('Pooja Patil')).toBeDefined();
    expect(screen.getByText('Membrane replacement required')).toBeDefined();
    expect(screen.getByText('Sanjay Deshmukh')).toBeDefined();
    expect(screen.getByText('Commercial RO 50 LPH (COMMERCIAL)')).toBeDefined();
    expect(screen.getByText('Rajesh Kulkarni')).toBeDefined();
  });

  it('3. Filters categorized activities when clicking category pill', async () => {
    vi.spyOn(duesApi, 'useDuesQuery').mockReturnValue({
      data: {
        selectedDate: '2027-08-15',
        summary: {
          totalActivities: 2,
          servicesCount: 1,
          doorstepVisitsCount: 1,
          rentalPaymentsCount: 0,
          otherActivitiesCount: 0,
        },
        doorstepVisits: [
          {
            id: 'srv-1',
            serviceNumber: 'SRV-2027-001',
            customerId: 'cust-1',
            customerName: 'Amit Sharma',
            customerPhone: '9822001122',
            customerNumber: 'CUST-001',
            serviceType: 'PERIODIC_MAINTENANCE',
            serviceLocation: 'DOORSTEP',
            serviceClassification: 'GENERAL',
            machineModel: 'AquaGuard Royal RO',
            scheduledDate: '2027-08-15',
            status: 'SCHEDULED',
            priority: 'NORMAL',
          },
        ],
        services: [
          {
            id: 'srv-2',
            serviceNumber: 'SRV-2027-002',
            customerId: 'cust-2',
            customerName: 'Pooja Patil',
            customerPhone: '9822334455',
            customerNumber: 'CUST-002',
            serviceType: 'REPAIR',
            serviceLocation: 'IN_SHOP',
            serviceClassification: 'GENERAL',
            machineModel: 'Kent Grand Plus',
            scheduledDate: '2027-08-15',
            status: 'SCHEDULED',
            priority: 'NORMAL',
          },
        ],
        rentalPayments: [],
        otherActivities: [],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    vi.spyOn(duesApi, 'useDuesMonthSummaryQuery').mockReturnValue({
      data: { year: 2027, month: 8, counts: {} },
    } as any);

    renderWithProviders(<DuesPage />);

    // Initially both Doorstep and Services are visible
    expect(screen.getByText('Doorstep Visits & Field Jobs')).toBeDefined();
    expect(screen.getByText('Services & Workshop Activities')).toBeDefined();

    // Click on Doorstep Visits filter button
    const doorstepPill = screen.getByRole('button', { name: /Doorstep Visits/i });
    fireEvent.click(doorstepPill);

    // Now Doorstep is visible, but in-shop services section is hidden
    expect(screen.getByText('Doorstep Visits & Field Jobs')).toBeDefined();
    expect(screen.queryByText('Services & Workshop Activities')).toBeNull();
  });
});
