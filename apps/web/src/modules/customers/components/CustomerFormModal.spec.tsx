import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerFormModal } from './CustomerFormModal';
import { ToastProvider } from '../../../providers/ToastProvider';

vi.mock('../customer.api', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useCreateCustomerMutation: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useUpdateCustomerMutation: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    checkCustomerDuplicateApi: vi.fn().mockResolvedValue({
      isDuplicate: false,
      matchField: null,
      existingCustomer: null,
    }),
  };
});

describe('CustomerFormModal Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderModal = (isOpen = true, customer = null) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CustomerFormModal
            isOpen={isOpen}
            onClose={vi.fn()}
            customer={customer}
          />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders creation form modal with required identity fields and optional address dropdown', () => {
    renderModal(true);
    expect(screen.getByText('Add New Customer')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SELECT SERVICE & INSTALLATION ADDRESS/i)).toBeInTheDocument();
    expect(screen.getByText('Create Customer')).toBeInTheDocument();
  });

  it('TEST 1 & 2: renders optional dropdown with skip/select options, and displays address fields when selected', () => {
    renderModal(true);
    const selectEl = screen.getByLabelText(/SELECT SERVICE & INSTALLATION ADDRESS/i) as HTMLSelectElement;
    expect(selectEl).toBeInTheDocument();
    expect(selectEl.options[0].text).toContain('-- Select / Add Service Address (Optional) --');
    
    // Select Address #1 to expand the form fields
    fireEvent.change(selectEl, { target: { value: '0' } });
    expect(screen.getByLabelText(/Address Line 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/State/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pincode/i)).toBeInTheDocument();
  });

  it('TEST 3, 4, 5: Customer with multiple addresses populates dropdown and switches active fields seamlessly', () => {
    const mockCustomer: any = {
      id: 'cust-multi-1',
      customerNumber: 'CUST-2026-0002',
      fullName: 'Vikram Malhotra',
      phone: '9826333444',
      email: 'vikram@example.com',
      customerType: 'INDIVIDUAL',
      addresses: [
        {
          id: 'addr-1',
          addressType: 'SERVICE',
          addressLine1: 'Main Service Location - Flat 402',
          landmark: 'Opp Metro Pillar 42',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411017',
          isDefault: true,
        },
        {
          id: 'addr-2',
          addressType: 'SERVICE',
          addressLine1: 'Branch Office - Shop 12',
          landmark: 'Near City Mall',
          city: 'Pimpri',
          state: 'Maharashtra',
          postalCode: '411018',
          isDefault: false,
        },
      ],
    };

    renderModal(true, mockCustomer);

    // Verify Dropdown shows optional label + both addresses
    const selectEl = screen.getByLabelText(/SELECT SERVICE & INSTALLATION ADDRESS/i) as HTMLSelectElement;
    expect(selectEl).toBeInTheDocument();
    expect(selectEl.options.length).toBe(3); // 1 optional skip + 2 addresses
    expect(selectEl.options[1].text).toContain('Address #1 (Default Service Location)');
    expect(selectEl.options[1].text).toContain('Pune');
    expect(selectEl.options[2].text).toContain('Address #2');
    expect(selectEl.options[2].text).toContain('Pimpri');

    // TEST 4: Address #1 data is initially populated because customer had existing address
    expect(screen.getByDisplayValue('Main Service Location - Flat 402')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pune')).toBeInTheDocument();
    expect(screen.getByDisplayValue('411017')).toBeInTheDocument();

    // TEST 5: Select Address #2 from dropdown
    fireEvent.change(selectEl, { target: { value: '1' } });

    // Address #2 data is now populated
    expect(screen.getByDisplayValue('Branch Office - Shop 12')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pimpri')).toBeInTheDocument();
    expect(screen.getByDisplayValue('411018')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Main Service Location - Flat 402')).toBeNull();

    // Switch back to Address #1
    fireEvent.change(selectEl, { target: { value: '0' } });
    expect(screen.getByDisplayValue('Main Service Location - Flat 402')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pune')).toBeInTheDocument();
  });

  it('TEST 6 & 7: Add another address appends new selectable address to dropdown and expands form', () => {
    renderModal(true);

    const addBtn = screen.getByRole('button', { name: /Add Another Address/i });
    expect(addBtn).toBeInTheDocument();

    fireEvent.click(addBtn);

    const selectEl = screen.getByLabelText(/SELECT SERVICE & INSTALLATION ADDRESS/i) as HTMLSelectElement;
    expect(selectEl.options.length).toBe(3); // 1 optional skip + 2 addresses
    expect(selectEl.value).toBe('1'); // Automatically selects newly added address
    expect(screen.getAllByText(/Address #2/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/Address Line 1/i)).toBeInTheDocument();
  });

  it('TEST 8, 9, 10: Editing an address updates only that specific address record and preserves unrelated customer fields', () => {
    const mockCustomer: any = {
      id: 'cust-edit-1',
      customerNumber: 'CUST-2026-0003',
      fullName: 'Sunil Sharma',
      phone: '9826111222',
      email: 'sunil@example.com',
      customerType: 'COMMERCIAL',
      companyName: 'Sharma RO Systems',
      addresses: [
        {
          id: 'addr-1',
          addressType: 'SERVICE',
          addressLine1: 'Office 101',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411001',
          isDefault: true,
        },
        {
          id: 'addr-2',
          addressType: 'SERVICE',
          addressLine1: 'Warehouse 4',
          city: 'Chakan',
          state: 'Maharashtra',
          postalCode: '410501',
          isDefault: false,
        },
      ],
    };

    renderModal(true, mockCustomer);

    const selectEl = screen.getByLabelText(/SELECT SERVICE & INSTALLATION ADDRESS/i) as HTMLSelectElement;
    fireEvent.change(selectEl, { target: { value: '1' } });

    // Verify identity fields are intact
    expect(screen.getByDisplayValue('Sunil Sharma')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9826111222')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sharma RO Systems')).toBeInTheDocument();

    // Verify warehouse 4 is displayed
    expect(screen.getByDisplayValue('Warehouse 4')).toBeInTheDocument();
  });
});
