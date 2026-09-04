import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryPage } from './InventoryPage';
import * as inventoryApi from './inventory.api';

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

const mockAnalytics = {
  period: 'month',
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2026-09-30T23:59:59.999Z',
  kpis: {
    totalSales: 25000,
    totalPurchases: 18000,
    totalCostOfGoodsSold: 14000,
    netProfit: 11000,
    grossMarginPercent: 44,
    totalQtySold: 35,
    totalQtyPurchased: 50,
    salesTransactionCount: 12,
    purchaseTransactionCount: 4,
    totalActiveItems: 8,
    totalStockQuantity: 120,
    currentStockValuation: 45000,
    lowStockItemsCount: 2,
  },
  topSellingItems: [
    {
      itemId: 'item-1',
      name: 'Sediment Filter 10 Inch',
      category: 'Filter',
      totalQuantitySold: 20,
      totalRevenue: '7000.00',
      totalProfit: '3000.00',
    },
  ],
  topProfitableItems: [
    {
      itemId: 'item-2',
      name: 'RO Membrane 75 GPD',
      category: 'Membrane',
      totalQuantitySold: 10,
      totalProfit: '6500.00',
      marginPercent: 43.3,
    },
  ],
  lowStockAlerts: [
    {
      id: 'item-3',
      name: 'Kemflo Booster Pump',
      category: 'Pump',
      brand: 'Kemflo',
      currentStock: 1,
      minStockLevel: 3,
    },
  ],
  dailySeries: [
    { date: '2026-09-01', sales: 4000, costs: 2200, profit: 1800 },
    { date: '2026-09-02', sales: 6500, costs: 3800, profit: 2700 },
  ],
};

const mockItems = [
  {
    id: 'item-1',
    name: 'Sediment Filter 10 Inch',
    category: 'Filter',
    brand: 'AquaFresh',
    partNumber: 'SF-10',
    purchasePrice: 200,
    sellingPrice: 350,
    currentStock: 15,
    minStockLevel: 5,
    status: 'ACTIVE' as const,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'item-2',
    name: 'RO Membrane 75 GPD',
    category: 'Membrane',
    brand: 'Dow Filmtec',
    partNumber: 'MEM-75',
    purchasePrice: 850,
    sellingPrice: 1500,
    currentStock: 1,
    minStockLevel: 3,
    status: 'ACTIVE' as const,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
];

const mockPurchases = [
  {
    id: 'pur-1',
    purchaseNumber: 'PUR-2026-0001',
    itemId: 'item-1',
    itemName: 'Sediment Filter 10 Inch',
    category: 'Filter',
    supplierName: 'Apex Waters',
    purchaseDate: '2026-09-01T10:00:00Z',
    quantity: 20,
    remainingQuantity: 15,
    purchasePricePerUnit: 200,
    totalAmount: 4000,
    notes: 'Lot #1',
    createdAt: '2026-09-01T10:00:00Z',
  },
];

const mockSales = [
  {
    id: 'sale-1',
    saleNumber: 'INV-SALE-2026-0001',
    itemId: 'item-1',
    itemName: 'Sediment Filter 10 Inch',
    category: 'Filter',
    customerName: 'Kishore Kumar',
    customerPhone: '9876543210',
    saleDate: '2026-09-02T11:00:00Z',
    quantity: 5,
    sellingPricePerUnit: 350,
    purchaseCostPerUnit: 200,
    totalSaleAmount: 1750,
    totalCostAmount: 1000,
    profit: 750,
    paymentStatus: 'COMPLETED',
    notes: 'Counter delivery',
    createdAt: '2026-09-02T11:00:00Z',
  },
];

const mockProfitLedger = [
  {
    id: 'sale-1',
    saleNumber: 'INV-SALE-2026-0001',
    saleDate: '2026-09-02T11:00:00Z',
    itemId: 'item-1',
    itemName: 'Sediment Filter 10 Inch',
    category: 'Filter',
    customerName: 'Kishore Kumar',
    quantity: 5,
    purchaseCostPerUnit: 200,
    sellingPricePerUnit: 350,
    totalCostAmount: 1000,
    totalSaleAmount: 1750,
    profit: 750,
    marginPercent: 42.9,
  },
];

describe('InventoryPage Frontend Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(inventoryApi, 'useInventoryAnalyticsQuery').mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
    } as any);

    vi.spyOn(inventoryApi, 'useInventoryItemsQuery').mockReturnValue({
      data: { data: mockItems, pagination: { page: 1, limit: 50, total: 2, totalPages: 1 } },
      isLoading: false,
    } as any);

    vi.spyOn(inventoryApi, 'useInventoryPurchasesQuery').mockReturnValue({
      data: { data: mockPurchases, pagination: { page: 1, limit: 50, total: 1, totalPages: 1 } },
      isLoading: false,
    } as any);

    vi.spyOn(inventoryApi, 'useInventorySalesQuery').mockReturnValue({
      data: { data: mockSales, pagination: { page: 1, limit: 50, total: 1, totalPages: 1 } },
      isLoading: false,
    } as any);

    vi.spyOn(inventoryApi, 'useInventoryProfitLedgerQuery').mockReturnValue({
      data: { data: mockProfitLedger, pagination: { page: 1, limit: 50, total: 1, totalPages: 1 } },
      isLoading: false,
    } as any);
  });

  it('1. Renders Inventory page title and action buttons', () => {
    renderWithProviders(<InventoryPage />);

    expect(screen.getByText('Inventory & Spare Parts')).toBeDefined();
    expect(screen.getByRole('button', { name: /add item/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /record purchase/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /record sale/i })).toBeDefined();
  });

  it('2. Renders all 5 navigation tabs', () => {
    renderWithProviders(<InventoryPage />);

    expect(screen.getByRole('button', { name: /overview & analytics/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /inventory items/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /purchases \(inward\)/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /sales \(outward\)/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /profit ledger/i })).toBeDefined();
  });

  it('3. Renders Overview KPI cards on initial view', () => {
    renderWithProviders(<InventoryPage />);

    expect(screen.getByText('Total Sales')).toBeDefined();
    expect(screen.getByText('Cost of Goods Sold')).toBeDefined();
    expect(screen.getAllByText('Net Profit').length).toBeGreaterThan(0);
    expect(screen.getByText('Stock Value')).toBeDefined();
    expect(screen.getByText('Low Stock Items')).toBeDefined();
    expect(screen.getByText('44% Gross Margin')).toBeDefined();
  });

  it('4. Navigates to Inventory Items tab and displays items with stock badges', () => {
    renderWithProviders(<InventoryPage />);

    const itemsTab = screen.getByRole('button', { name: /inventory items/i });
    fireEvent.click(itemsTab);

    expect(screen.getByText('Sediment Filter 10 Inch')).toBeDefined();
    expect(screen.getByText('RO Membrane 75 GPD')).toBeDefined();
    expect(screen.getByText('15 units')).toBeDefined();
    expect(screen.getByText('1 units')).toBeDefined();
  });

  it('5. Navigates to Purchases tab and displays inward records', () => {
    renderWithProviders(<InventoryPage />);

    const purchasesTab = screen.getByRole('button', { name: /purchases \(inward\)/i });
    fireEvent.click(purchasesTab);

    expect(screen.getByText('PUR-2026-0001')).toBeDefined();
    expect(screen.getByText('Apex Waters')).toBeDefined();
  });

  it('6. Navigates to Sales tab and displays outward records', () => {
    renderWithProviders(<InventoryPage />);

    const salesTab = screen.getByRole('button', { name: /sales \(outward\)/i });
    fireEvent.click(salesTab);

    expect(screen.getByText('INV-SALE-2026-0001')).toBeDefined();
    expect(screen.getByText('Kishore Kumar')).toBeDefined();
  });

  it('7. Navigates to Profit Ledger tab and displays margin and profit calculations', () => {
    renderWithProviders(<InventoryPage />);

    const profitTab = screen.getByRole('button', { name: /profit ledger/i });
    fireEvent.click(profitTab);

    expect(screen.getByText('Transaction-Level Profit Ledger')).toBeDefined();
    expect(screen.getByText('+₹750.00')).toBeDefined();
    expect(screen.getByText('42.9%')).toBeDefined();
  });
});
