import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../../providers/ToastProvider';
import { ScheduleServiceModal } from './ScheduleServiceModal';

const mockMutateAsync = vi.fn();

vi.mock('../../customers/customer.api', () => ({
  useCustomersQuery: () => ({
    data: {
      data: [
        {
          id: 'cust-1',
          fullName: 'Anil Kumar Sharma',
          phone: '9123456780',
          customerNumber: 'CUST-2026-0001',
          companyName: 'Sharma RO Solutions',
          createdAt: '2026-08-20T10:00:00Z',
        },
        {
          id: 'cust-2',
          fullName: 'Sunil Verma',
          phone: '9876543210',
          customerNumber: 'CUST-2026-0002',
          companyName: 'Verma Enterprises',
          createdAt: '2026-08-21T10:00:00Z',
        },
      ],
    },
  }),
  useCustomerDetailQuery: () => ({
    data: {
      id: 'cust-1',
      assets: [
        {
          id: 'asset-1',
          assetNumber: 'AST-2026-0001',
          serialNumber: 'SN123456',
          product: { name: 'AquaPure Pro RO', brand: 'AquaPure', sku: 'AP-RO-01' },
        },
      ],
    },
  }),
}));

vi.mock('../../assets/assets.api', () => ({
  useAssetsQuery: () => ({
    data: {
      data: [
        {
          id: 'asset-1',
          assetNumber: 'AST-2026-0001',
          productName: 'AquaPure Pro RO',
          serialNumber: 'SN123456',
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('../services.api', () => ({
  useTechniciansQuery: () => ({
    data: [{ id: 'tech-1', name: 'Ramesh Patel', phone: '9898989898' }],
  }),
  useCreateServiceMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe('ScheduleServiceModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderModal = (props = { isOpen: true, onClose: vi.fn() }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ScheduleServiceModal {...props} />
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  it('renders customer search bar and filters customer dropdown options in real-time', () => {
    renderModal();

    // Verify search bar input is rendered
    const searchInput = screen.getByPlaceholderText(/Search customer by name, phone number, customer #, or company/i);
    expect(searchInput).toBeInTheDocument();

    // Verify both customers are available in dropdown initially
    expect(screen.getByText(/Anil Kumar Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunil Verma/i)).toBeInTheDocument();

    // Type in search bar to filter by name
    fireEvent.change(searchInput, { target: { value: 'Sunil' } });

    // Verify matching count indicator is displayed
    expect(screen.getByText(/1 matching customer\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunil Verma/i)).toBeInTheDocument();
    expect(screen.queryByText(/Anil Kumar Sharma/i)).not.toBeInTheDocument();

    // Clear search using clear button
    const clearButton = screen.getByTitle('Clear search');
    fireEvent.click(clearButton);

    // Both customers should be visible again
    expect(screen.getByText(/Anil Kumar Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunil Verma/i)).toBeInTheDocument();
  });

  it('submits valid service visit payload and invokes onClose', async () => {
    const onClose = vi.fn();
    mockMutateAsync.mockResolvedValueOnce({
      service: { id: 'srv-1', serviceNumber: 'SRV-2026-0001' },
      jobCard: { id: 'jc-1', jobCardNumber: 'JC-2026-0001' },
    });

    renderModal({ isOpen: true, onClose });

    // Select customer
    const customerSelect = screen.getByDisplayValue(/Choose Customer/i);
    fireEvent.change(customerSelect, { target: { value: 'cust-1' } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Confirm & Schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          serviceType: 'PERIODIC_MAINTENANCE',
          serviceLocation: 'DOORSTEP',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('displays validation error and stops loading if customer is not selected', async () => {
    renderModal();

    const submitBtn = screen.getByRole('button', { name: /Confirm & Schedule/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please select a customer/i)).toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();
  });
});
