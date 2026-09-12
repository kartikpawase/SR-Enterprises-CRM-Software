import React, { useMemo } from 'react';
import { Search, Calendar, SlidersHorizontal, ChevronDown, RotateCcw } from 'lucide-react';
import { useCustomersQuery, type CustomerSummary } from '../../customers/customer.api';
import { useProductsQuery } from '../sales.api';

export interface SalesFilterValues {
  customer: string;
  product: string;
  status: string;
  datePreset: string;
  search: string;
}

interface SalesFilterBarProps {
  filters: SalesFilterValues;
  onFilterChange: (key: keyof SalesFilterValues, value: string) => void;
  onResetFilters?: () => void;
  onMoreFiltersClick?: () => void;
}

export const SalesFilterBar: React.FC<SalesFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onMoreFiltersClick,
}) => {
  const { data: customersData } = useCustomersQuery({
    page: 1,
    limit: 500,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: products = [] } = useProductsQuery();

  const customerList = useMemo<CustomerSummary[]>(() => {
    const raw = customersData?.data || [];
    return [...raw].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [customersData]);
  const isFilterActive = Boolean(
    filters.customer ||
    filters.product ||
    filters.status ||
    filters.search ||
    filters.datePreset
  );

  return (
    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
      {/* Dropdown Filters */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0 sm:min-w-[280px]">
        {/* Customer Select */}
        <div className="relative">
          <select
            aria-label="Filter by Customer"
            value={filters.customer}
            onChange={(e) => onFilterChange('customer', e.target.value)}
            className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg px-3 py-2 pr-7 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[220px] truncate"
          >
            <option value="">All Customers</option>
            {customerList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.customerNumber})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Products Select */}
        <div className="relative">
          <select
            aria-label="Filter by Product"
            value={filters.product}
            onChange={(e) => onFilterChange('product', e.target.value)}
            className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg px-3 py-2 pr-7 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[200px] truncate"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status Select */}
        <div className="relative">
          <select
            aria-label="Filter by Status"
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg px-3 py-2 pr-7 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="COMPLETED">Delivered</option>
            <option value="DRAFT">Draft / Processing</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Date Preset Select with Calendar Icon */}
        <div className="relative">
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg px-2.5 py-2 border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              aria-label="Filter by Date Range"
              value={filters.datePreset}
              onChange={(e) => onFilterChange('datePreset', e.target.value)}
              className="appearance-none bg-transparent font-medium text-xs text-slate-700 pr-5 focus:outline-none cursor-pointer"
            >
              <option value="">All Time</option>
              <option value="this_month">This Month</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Reset Filters button if active */}
        {isFilterActive && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium text-xs rounded-lg border border-rose-200 transition-colors shadow-2xs cursor-pointer"
            title="Reset Filters"
          >
            <RotateCcw className="w-3 h-3 text-rose-500" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Search and More Filters */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sales orders..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 text-xs rounded-lg pl-9 pr-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>

        {/* More Filters Button */}
        <button
          type="button"
          onClick={onMoreFiltersClick}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors shadow-2xs shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span>More Filters</span>
        </button>
      </div>
    </div>
  );
};
