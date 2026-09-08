import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerLabelModal } from './CustomerLabelModal';
import { ToastProvider } from '../../../providers/ToastProvider';

const mockMutateAsync = vi.fn();
const mockCreateCustomLabel = vi.fn();
const mockUpdateCustomLabel = vi.fn();

vi.mock('../customer.api', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useUpdateCustomerLabelMutation: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }),
    useCustomLabelsQuery: () => ({
      data: [
        { id: 'custom-1', name: 'VIP Customer', color: '#2563EB' },
        { id: 'custom-2', name: 'AMC Customer', color: '#059669' },
      ],
      isLoading: false,
    }),
    useCreateCustomLabelMutation: () => ({
      mutateAsync: mockCreateCustomLabel,
      isPending: false,
    }),
    useUpdateCustomLabelMutation: () => ({
      mutateAsync: mockUpdateCustomLabel,
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

  it('displays all classification options: Good Customer, Bad Customer, No Label, and Custom Label', () => {
    renderModal(true);
    expect(screen.getAllByText('Good Customer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bad Customer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/No Label \/ Unassigned/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Custom Label').length).toBeGreaterThanOrEqual(1);
  });

  it('submits selected Good Customer label on clicking Save Label', async () => {
    mockMutateAsync.mockClear();
    renderModal(true);
    const goodCustomerRadio = screen.getByRole('radio', { name: /Good Customer/i });
    fireEvent.click(goodCustomerRadio);

    const saveButton = screen.getByRole('button', { name: /Save Label/i });
    fireEvent.click(saveButton);

    expect(mockMutateAsync).toHaveBeenCalledWith('GOOD');
  });

  it('submits selected Bad Customer label on clicking Save Label', async () => {
    mockMutateAsync.mockClear();
    renderModal(true);
    const badCustomerRadio = screen.getByRole('radio', { name: /Bad Customer/i });
    fireEvent.click(badCustomerRadio);

    const saveButton = screen.getByRole('button', { name: /Save Label/i });
    fireEvent.click(saveButton);

    expect(mockMutateAsync).toHaveBeenCalledWith('BAD');
  });

  it('submits No Label / Unassigned on clicking Save Label', async () => {
    mockMutateAsync.mockClear();
    renderModal(true, { ...sampleCustomer, customerLabel: 'GOOD' });
    const noLabelRadio = screen.getByRole('radio', { name: /No Label \/ Unassigned/i });
    fireEvent.click(noLabelRadio);

    const saveButton = screen.getByRole('button', { name: /Save Label/i });
    fireEvent.click(saveButton);

    expect(mockMutateAsync).toHaveBeenCalledWith(null);
  });

  it('allows selecting Custom Label and submitting custom label payload', async () => {
    mockMutateAsync.mockClear();
    renderModal(true);
    const customLabelRadio = screen.getByRole('radio', { name: /Custom Label/i });
    fireEvent.click(customLabelRadio);

    // Enter custom name
    const input = screen.getByPlaceholderText(/e\.g\., VIP Customer/i);
    fireEvent.change(input, { target: { value: 'High Value VIP' } });

    const saveButton = screen.getByRole('button', { name: /Save Label/i });
    fireEvent.click(saveButton);

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'CUSTOM',
        newCustomLabel: expect.objectContaining({
          name: 'High Value VIP',
        }),
      })
    );
  });
});
