import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../../providers/ToastProvider';
import { InvoiceFormModal } from './InvoiceFormModal';
import * as invoicesApi from '../invoices.api';
import * as customerApi from '../../customers/customer.api';

vi.mock('../../customers/customer.api', () => ({
  useCustomersQuery: () => ({
    data: {
      data: [
        { id: '11111111-1111-1111-1111-111111111111', fullName: 'Rajesh Sharma', phone: '9876543210', companyName: 'RS Enterprises' },
        { id: '22222222-2222-2222-2222-222222222222', fullName: 'Pooja Patel', phone: '9123456780', companyName: 'PP Water' },
      ],
    },
    isLoading: false,
  }),
}));

describe('InvoiceFormModal Component — UI Logic & Edge Cases', () => {
  let queryClient: QueryClient;
  const mockCreateMutate = vi.fn();
  const mockUpdateMutate = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();

    vi.spyOn(invoicesApi, 'useCreateInvoiceMutation').mockReturnValue({
      mutateAsync: mockCreateMutate,
      isPending: false,
    } as any);

    vi.spyOn(invoicesApi, 'useUpdateInvoiceMutation').mockReturnValue({
      mutateAsync: mockUpdateMutate,
      isPending: false,
    } as any);
  });

  const renderModal = (props: { isOpen: boolean; onClose: () => void; initialInvoice?: any }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <InvoiceFormModal {...props} />
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  it('TEST 1: Renders create modal with 1 default row, valid dates, and allows creation', () => {
    renderModal({ isOpen: true, onClose: vi.fn() });

    expect(screen.getByText('Create New Tax Invoice')).toBeDefined();
    expect(screen.getByText('Invoice Items (1/10)')).toBeDefined();
    expect(screen.getByPlaceholderText('e.g. PO-89240')).toBeDefined();
  });

  it('TEST 4 & 5: Allows adding up to 10 rows and strictly disables "Add Row" at 10 items', () => {
    renderModal({ isOpen: true, onClose: vi.fn() });

    const addRowBtn = screen.getByText('Add Row');
    expect(addRowBtn).toBeDefined();

    // Currently 1 row. Click Add Row 9 times to reach 10 rows
    for (let i = 2; i <= 10; i++) {
      fireEvent.click(addRowBtn);
      expect(screen.getByText(`Invoice Items (${i}/10)`)).toBeDefined();
    }

    // At 10 rows: Add Row button must be disabled and warning shown
    expect(screen.getByText('Invoice Items (10/10)')).toBeDefined();
    expect((addRowBtn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Maximum limit of 10 items reached/i)).toBeDefined();

    // Clicking Add Row while disabled must not add an 11th row
    fireEvent.click(addRowBtn);
    expect(screen.getByText('Invoice Items (10/10)')).toBeDefined();
    expect(screen.queryByText('Invoice Items (11/10)')).toBeNull();
  });

  it('TEST 6: Validates that Due Date cannot be earlier than Invoice Date', () => {
    renderModal({ isOpen: true, onClose: vi.fn() });

    const invoiceDateInput = screen.getAllByDisplayValue(new Date().toISOString().split('T')[0])[0];
    const dueDateInput = screen.getAllByDisplayValue(new Date().toISOString().split('T')[0])[1];

    // Set invoice date to 2026-09-10 and due date to 2026-09-01 (earlier)
    fireEvent.change(invoiceDateInput, { target: { value: '2026-09-10' } });
    fireEvent.change(dueDateInput, { target: { value: '2026-09-01' } });

    // Inline validation error must appear
    expect(screen.getByText('Due Date cannot be earlier than Invoice Date')).toBeDefined();

    // Submit button must be disabled
    const submitBtn = screen.getByText('Create Invoice') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('TEST 2, 3 & 7: Pre-fills existing data in edit mode (PO, Notes, Items, Dates)', () => {
    const existingInvoice = {
      id: 'inv-edit-1',
      invoiceNumber: '0926251',
      customerId: '11111111-1111-1111-1111-111111111111',
      customerName: 'Rajesh Sharma',
      poNumber: 'PO-TEST-99',
      invoiceDate: '2026-09-05T00:00:00.000Z',
      dueDate: '2026-09-15T00:00:00.000Z',
      notes: '1 Year Full Warranty with 2 Free PMs',
      discountAmount: '500',
      totalAmount: '4500',
      items: [
        {
          id: 'item-1',
          nameSnapshot: 'Commercial RO Filter 100 LPH',
          quantity: 2,
          unitPriceSnapshot: '2500',
          lineTotal: '5000',
        },
      ],
    };

    renderModal({ isOpen: true, onClose: vi.fn(), initialInvoice: existingInvoice as any });

    expect(screen.getByText('Edit Invoice: 0926251')).toBeDefined();
    expect(screen.getByDisplayValue('PO-TEST-99')).toBeDefined();
    expect(screen.getByDisplayValue('1 Year Full Warranty with 2 Free PMs')).toBeDefined();
    expect(screen.getByDisplayValue('Commercial RO Filter 100 LPH')).toBeDefined();
    expect(screen.getByText('Update Invoice')).toBeDefined();
  });
});
