import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../providers/ToastProvider';
import { SalesDirectory } from './SalesDirectory';

vi.mock('../../providers/AuthBoundary', () => ({
  useAuth: () => ({
    hasPermission: () => true,
    user: { id: 'test-user', fullName: 'Staff Member' },
  }),
}));

vi.mock('./sales.api', () => ({
  useSalesQuery: () => ({
    data: {
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          saleNumber: 'SALE-2026-0001',
          customerId: '22222222-2222-2222-2222-222222222222',
          customerName: 'Aarav Sharma',
          customerNumber: 'CUST-2026-0001',
          customerPhone: '+919876543210',
          saleDate: new Date('2026-03-01').toISOString(),
          status: 'COMPLETED',
          subtotal: '18900.00',
          discountAmount: '0.00',
          taxAmount: '3402.00',
          totalAmount: '22302.00',
          invoice: {
            id: '33333333-3333-3333-3333-333333333333',
            invoiceNumber: 'INV-2026-0001',
            status: 'ISSUED',
          },
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    },
    isLoading: false,
  }),
  useSalesStatsQuery: () => ({
    data: {
      totalSales: 22302,
      totalOrders: 1,
      topProducts: [],
      recentSales: [],
    },
    isLoading: false,
  }),
  useExportSalesMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useProductsQuery: () => ({
    data: [],
    isLoading: false,
  }),
  useDeleteSaleMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

import { SalesKpiCards } from './components/SalesKpiCards';

describe('Phase 5 — Sales Directory Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders sales directory with page header, create sale button, and sales list', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <SalesDirectory />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Sales & Orders')).toBeDefined();
    expect(screen.getByText('Create Sale')).toBeDefined();
    expect(screen.getByText('SALE-2026-0001')).toBeDefined();
    expect(screen.getByText('Aarav Sharma')).toBeDefined();
    expect(screen.getByText('INV-2026-0001')).toBeDefined();
  });

  it('renders flat baseline graph for 0 pending and upward curves for positive metrics', () => {
    const { container } = render(
      <SalesKpiCards
        data={{
          totalSales: '₹ 19,470.00',
          totalSalesTrend: '12.4%',
          orders: 1,
          ordersTrend: '18.6%',
          avgOrderValue: '₹ 19,470.00',
          avgOrderTrend: '16.2%',
          completed: 1,
          completedTrend: '20.4%',
          pending: 0,
          pendingTrend: '0%',
        }}
      />
    );

    expect(screen.getAllByText('₹ 19,470.00').length).toBe(2);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();

    const paths = container.querySelectorAll('svg.overflow-visible path');
    expect(paths.length).toBe(5);

    // Card 5 (Pending = 0) has a flat baseline path M 0 16 L 50 16
    const pendingPath = paths[4]?.getAttribute('d');
    expect(pendingPath).toBe('M 0 16 L 50 16');

    // Card 1 (Total Sales > 0) has growth curve
    const salesPath = paths[0]?.getAttribute('d');
    expect(salesPath).toContain('Q');
  });
});
