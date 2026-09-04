import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateJobCardModal } from './CreateJobCardModal';

// Mock mutations and queries
const mutateAsyncMock = vi.fn();
vi.mock('../job-cards.api', () => ({
  useCreateJobCardMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

const mockServicesData = {
  data: [
    {
      id: 'srv-101',
      serviceNumber: 'SRV-2026-0001',
      status: 'SCHEDULED',
      serviceType: 'PERIODIC_MAINTENANCE',
      serviceLocation: 'DOORSTEP',
      scheduledDate: '2026-09-03T10:00:00Z',
      scheduledTimeSlot: '10:00 AM - 12:00 PM',
      priority: 'HIGH',
      customerId: 'cust-101',
      customerName: 'Kartik Pawase',
      customerPhone: '9021653893',
      assetId: 'ast-101',
      productName: 'Lippure RO Machine',
      serialNumber: 'SN-RO-119099',
      technicianId: 'tech-1',
      customerNotes: 'Filter replacement requested',
    },
    {
      id: 'srv-102',
      serviceNumber: 'SRV-2026-0002',
      status: 'COMPLETED', // Not eligible
      serviceType: 'REPAIR',
      customerName: 'Completed Customer',
      productName: 'RO 2',
      scheduledDate: '2026-08-01T10:00:00Z',
    },
  ],
  pagination: { total: 2, page: 1, limit: 200, totalPages: 1 },
};

vi.mock('../../services/services.api', () => ({
  useServicesQuery: () => ({
    data: mockServicesData,
    isLoading: false,
    error: null,
  }),
}));

describe('CreateJobCardModal Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockTechnicians = [
    { id: 'tech-1', fullName: 'Suresh Kumar', phone: '9876543210', status: 'ACTIVE' },
  ];

  const renderModal = (isOpen = true, onClose = vi.fn()) =>
    render(
      <QueryClientProvider client={queryClient}>
        <CreateJobCardModal
          isOpen={isOpen}
          onClose={onClose}
          technicians={mockTechnicians as any}
        />
      </QueryClientProvider>
    );

  it('renders dropdown with eligible scheduled services and rich format', () => {
    renderModal();

    expect(screen.getByText(/Create Job Card/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Scheduled Service/i)).toBeInTheDocument();

    // Check placeholder showing available count
    expect(
      screen.getByText(/Choose Scheduled Service Order \(1 available\)/i)
    ).toBeInTheDocument();

    // Check option format
    expect(
      screen.getByText(/Kartik Pawase — Lippure RO Machine \[SN: SN-RO-119099\] • PERIODIC MAINTENANCE/i)
    ).toBeInTheDocument();
  });

  it('populates service summary preview on service selection', () => {
    renderModal();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'srv-101' } });

    // Verify preview card appears
    expect(screen.getByText(/Kartik Pawase \(9021653893\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Lippure RO Machine/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Filter replacement requested/i)).toBeInTheDocument();
  });
});
