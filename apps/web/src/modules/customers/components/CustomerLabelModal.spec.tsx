import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerLabelModal } from './CustomerLabelModal';
import { ToastProvider } from '../../../providers/ToastProvider';

const mockMutateAsync = vi.fn();

vi.mock('../customer.api', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useUpdateCustomerLabelMutation: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }),
  };
});

describe('CustomerLabelModal Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const sampleCustomer: any = {
    id: 'cust-123',
    customerNumber: 'CX-1001',
    fullName: 'Rajesh Kumar',
    customerLabel: null,
  };

  const renderModal = (isOpen = true, customer = sampleCustomer) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CustomerLabelModal
            isOpen={isOpen}
            onClose={vi.fn()}
            customer={customer}
          />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders modal with title and description containing customer details', () => {
    renderModal(true);
    expect(screen.getByText('Customer Label')).toBeInTheDocument();
    expect(screen.getByText(/Rajesh Kumar/i)).toBeInTheDocument();
  });

  it('displays the three required classification options: Good Customer, Bad Customer, No Label', () => {
    renderModal(true);
    expect(screen.getAllByText('Good Customer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bad Customer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/No Label \/ Unassigned/i).length).toBeGreaterThanOrEqual(1);
  });

  it('submits selected label on clicking Save Label', async () => {
    renderModal(true);
    const goodCustomerRadio = screen.getByRole('radio', { name: /Good Customer/i });
    fireEvent.click(goodCustomerRadio);

    const saveButton = screen.getByRole('button', { name: /Save Label/i });
    fireEvent.click(saveButton);

    expect(mockMutateAsync).toHaveBeenCalledWith('GOOD');
  });
});
