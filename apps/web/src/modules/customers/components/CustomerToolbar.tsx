import React from 'react';
import { Search, SlidersHorizontal, RefreshCw, ChevronDown } from 'lucide-react';

export interface CustomerToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  customerType: string;
  onCustomerTypeChange: (val: string) => void;
  customerLabel?: string;
  onCustomerLabelChange?: (val: string) => void;
  city: string;
  onCityChange: (val: string) => void;
  onRefresh?: () => void;
  onMoreFilters?: () => void;
}

export const CustomerToolbar: React.FC<CustomerToolbarProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  customerType,
  onCustomerTypeChange,
  customerLabel,
  onCustomerLabelChange,
  city,
  onCityChange,
  onRefresh,
  onMoreFilters,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 select-none">
      {/* Search Input Field */}
      <div className="relative flex-1 min-w-0 sm:min-w-[280px]">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, mobile, email or customer ID..."
          className="w-full h-10 pl-10 pr-4 bg-slate-50/60 focus:bg-white rounded-xl border border-slate-200/90 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs hover:border-slate-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all"
        />
      </div>

      {/* Filter Dropdowns + More Filters + Refresh Button */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Status Filter */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by customer status"
            className="h-10 pl-3.5 pr-8 bg-white rounded-xl border border-slate-200/90 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:border-slate-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Customer Type Filter */}
        <div className="relative">
          <select
            value={customerType}
            onChange={(e) => onCustomerTypeChange(e.target.value)}
            aria-label="Filter by customer type"
            className="h-10 pl-3.5 pr-8 bg-white rounded-xl border border-slate-200/90 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:border-slate-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="ALL">Customer Type</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Customer Label Filter */}
        {onCustomerLabelChange && (
          <div className="relative">
            <select
              value={customerLabel || 'ALL'}
              onChange={(e) => onCustomerLabelChange(e.target.value)}
              aria-label="Filter by customer label"
              className="h-10 pl-3.5 pr-8 bg-white rounded-xl border border-slate-200/90 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:border-slate-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">All Labels</option>
              <option value="GOOD">Good Customer</option>
              <option value="BAD">Bad Customer</option>
              <option value="NONE">No Label</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* City Filter */}
        <div className="relative">
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            aria-label="Filter by city"
            className="h-10 pl-3.5 pr-8 bg-white rounded-xl border border-slate-200/90 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:border-slate-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="ALL">City</option>
            <option value="Pune">Pune</option>
            <option value="PCMC">PCMC</option>
            <option value="Pimpri">Pimpri</option>
            <option value="Chinchwad">Chinchwad</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* More Filters Button */}
        <button
          type="button"
          onClick={onMoreFilters}
          className="h-10 px-3.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/90 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:border-slate-300 flex items-center gap-2 transition-all cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <span>More Filters</span>
        </button>

        {/* Circular Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh table"
          aria-label="Refresh customer list"
          className="w-10 h-10 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/90 text-slate-600 hover:text-slate-900 shadow-2xs hover:border-slate-300 flex items-center justify-center transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
};
