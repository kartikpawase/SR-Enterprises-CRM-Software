import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicInvoicePage } from './PublicInvoicePage';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('PublicInvoicePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (apiClient.get as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/invoice/view/INV-001']}>
        <Routes>
          <Route path="/invoice/view/:id" element={<PublicInvoicePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading your official invoice.../i)).toBeDefined();
  });

  it('renders official tax invoice when data resolves successfully', async () => {
    (apiClient.get as any).mockResolvedValue({
      success: true,
      data: {
        id: 'inv-uuid-1',
        invoiceNumber: 'INV-2026-0099',
        customerId: 'cust-1',
        customerName: 'Ganesh More',
        customerPhone: '9822012345',
        invoiceDate: '2026-09-10T10:00:00.000Z',
        dueDate: '2026-09-25T10:00:00.000Z',
        subtotal: '15000.00',
        discountAmount: '0.00',
        taxAmount: '2700.00',
        totalAmount: '17700.00',
        paidAmount: '17700.00',
        outstandingAmount: '0.00',
        status: 'PAID',
        items: [
          {
            id: 'item-1',
            nameSnapshot: 'Kent Grand Plus RO Water Purifier',
            quantity: 1,
            unitPriceSnapshot: '15000.00',
            discountAmount: '0.00',
            taxRatePercent: '18',
            taxAmount: '2700.00',
            lineTotal: '17700.00',
          },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={['/invoice/view/INV-2026-0099']}>
        <Routes>
          <Route path="/invoice/view/:id" element={<PublicInvoicePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('GANESH MORE')).toBeDefined();
    expect((await screen.findAllByText('INV-2026-0099')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('TAX INVOICE / BILL OF SUPPLY')).toBeDefined();
    expect(await screen.findByText('Kent Grand Plus RO Water Purifier')).toBeDefined();
    expect(await screen.findByText(/Payment Status: Fully Paid/i)).toBeDefined();
  });

  it('renders error state when invoice is not found', async () => {
    (apiClient.get as any).mockRejectedValue(new Error('Invoice not found'));

    render(
      <MemoryRouter initialEntries={['/invoice/view/non-existent']}>
        <Routes>
          <Route path="/invoice/view/:id" element={<PublicInvoicePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Invoice Not Found')).toBeDefined();
    expect(await screen.findByText(/Call SR Enterprises/i)).toBeDefined();
  });
});
