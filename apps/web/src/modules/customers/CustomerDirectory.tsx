import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Plus, ChevronRight } from 'lucide-react';
import { CustomerTopHeader } from './components/CustomerTopHeader';
import { CustomerSummaryCards } from './components/CustomerSummaryCards';
import { CustomerToolbar } from './components/CustomerToolbar';
import { CustomerTable, type CustomerRecord } from './components/CustomerTable';
import { CustomerDetailsPanel } from './components/CustomerDetailsPanel';
import { CustomerPagination } from './components/CustomerPagination';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerArchiveDialog } from './components/CustomerArchiveDialog';
import { CustomerImportModal } from './components/CustomerImportModal';
import { useCustomersQuery, useCustomerStatsQuery, exportCustomersApi, type CustomerSummary } from './customer.api';
import { useAuth } from '../../providers/AuthBoundary';
import { useToast } from '../../providers/ToastProvider';

export const CustomerDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('ALL');
  const [customerLabelFilter, setCustomerLabelFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<CustomerSummary | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCustomerForArchive, setSelectedCustomerForArchive] = useState<CustomerSummary | null>(null);

  const canCreate = hasPermission('customers.create');

  // Query live database customers
  const { data: response, refetch, isLoading } = useCustomersQuery({
    page,
    limit: pageSize,
    search: search.trim() || undefined,
    status: (statusFilter as any) || 'ALL',
    customerType: customerTypeFilter !== 'ALL' ? (customerTypeFilter as any) : undefined,
    customerLabel: customerLabelFilter !== 'ALL' ? (customerLabelFilter as any) : undefined,
    city: cityFilter !== 'ALL' ? cityFilter : undefined,
    sortBy: 'customerNumber',
    sortOrder: 'asc',
  });

  // Query aggregated customer stats from live CRM database
  const { data: stats } = useCustomerStatsQuery();

  const totalCustomers = (stats?.totalCustomers !== undefined && stats.totalCustomers > 0)
    ? stats.totalCustomers
    : (response?.pagination?.total ?? 0);
  const activeCustomers = (stats?.activeCustomers !== undefined && stats.activeCustomers > 0)
    ? stats.activeCustomers
    : totalCustomers;

  // Transform live database records to table model
  const customerList: CustomerRecord[] = useMemo(() => {
    if (!response?.data || response.data.length === 0) {
      return [];
    }

    return response.data.map((item) => {
      const defaultAddr = item.addresses?.find((a) => a.isDefault) || item.addresses?.[0];
      const initials = item.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'CU';

      const cityParts = [defaultAddr?.city, defaultAddr?.state].filter(Boolean);
      const cityDisplay = cityParts.length > 0 ? cityParts.join(', ') : (defaultAddr?.addressLine1 || '—');

      const addrParts = [
        defaultAddr?.addressLine1,
        defaultAddr?.addressLine2,
        defaultAddr?.city,
        defaultAddr?.state,
        defaultAddr?.postalCode,
      ].filter(Boolean);
      const fullAddress = addrParts.length > 0 ? addrParts.join(', ') : '—';

      const customerSinceFormatted = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Recently';

      const lastServiceFormatted = (item as any).lastServiceDate
        ? new Date((item as any).lastServiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

      const nextServiceRaw = (item as any).nextServiceDate;
      const nextServiceFormatted = nextServiceRaw
        ? new Date(nextServiceRaw).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

      let nextServiceDaysCalc: number | 'Expired' | null = null;
      if (nextServiceRaw) {
        const diffMs = new Date(nextServiceRaw).getTime() - Date.now();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        nextServiceDaysCalc = days < 0 ? 'Expired' : days;
      }

      const totalInvoicesFormatted = (item as any).totalInvoicesAmount
        ? `₹ ${parseFloat((item as any).totalInvoicesAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '₹ 0.00';

      const outstandingFormatted = (item as any).outstandingAmount
        ? `₹ ${parseFloat((item as any).outstandingAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '₹ 0.00';

      const activeWarrantyStatus = (item as any).activeWarranty || 'No';

      return {
        id: item.id,
        customerNumber: item.customerNumber,
        fullName: item.fullName,
        initials,
        phone: item.phone,
        email: item.email || '—',
        city: cityDisplay,
        address: fullAddress,
        customerType: item.customerType,
        lastServiceDate: lastServiceFormatted,
        nextServiceDate: nextServiceFormatted,
        nextServiceDays: nextServiceDaysCalc,
        status: item.status as any,
        customerLabel: (item as any).customerLabel || null,
        customLabel: (item as any).customLabel || null,
        summary: {
          totalInvoices: totalInvoicesFormatted,
          outstanding: outstandingFormatted,
          activeWarranty: activeWarrantyStatus,
          customerSince: customerSinceFormatted,
        },
        assets: (item as any).assets || [],
        services: (item as any).services || [],
        invoices: (item as any).invoices || [],
        payments: (item as any).payments || [],
        assetsCount: (item as any).assetsCount ?? (item.assets?.length || 0),
        servicesCount: (item as any).servicesCount ?? 0,
        invoicesCount: (item as any).invoicesCount ?? 0,
        paymentsCount: (item as any).paymentsCount ?? 0,
      };
    });
  }, [response]);

  // Ensure an active customer is selected for the customer overview card
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId) {
      const found = customerList.find((c) => c.id === selectedCustomerId);
      if (found) return found;
    }
    return customerList[0] || null;
  }, [customerList, selectedCustomerId]);

  const handleSelectCustomer = (customer: CustomerRecord) => {
    setSelectedCustomerId(customer.id);
  };

  const handleViewProfile = (customer: CustomerRecord) => {
    navigate(`/customers/${customer.id}`);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleCustomerTypeChange = (val: string) => {
    setCustomerTypeFilter(val);
    setPage(1);
  };

  const handleCustomerLabelChange = (val: string) => {
    setCustomerLabelFilter(val);
    setPage(1);
  };

  const handleCityChange = (val: string) => {
    setCityFilter(val);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleRefresh = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCustomerTypeFilter('ALL');
    setCityFilter('ALL');
    setPage(1);
    refetch();
  };

  const handleExport = async () => {
    try {
      toast.info('Generating customer export file...', 'Export Started');
      await exportCustomersApi({
        search: search.trim() || undefined,
        status: (statusFilter as any) || 'ALL',
        customerType: customerTypeFilter !== 'ALL' ? (customerTypeFilter as any) : undefined,
        city: cityFilter !== 'ALL' ? cityFilter : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      toast.success('Customer export downloaded successfully.', 'Export Complete');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export customers', 'Export Error');
    }
  };

  const handleCustomerCreated = (newCust: CustomerSummary) => {
    setPage(1);
    setSearch('');
    setStatusFilter('ALL');
    setCustomerTypeFilter('ALL');
    setCityFilter('ALL');
    if (newCust && newCust.id) {
      setSelectedCustomerId(newCust.id);
    }
    refetch();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150 select-none">
      {/* 1. TOP HEADER (Search + Live Date + Notifications + Profile) */}
      <CustomerTopHeader onSearch={handleSearchChange} />

      {/* 2. PAGE TITLE SECTION + BREADCRUMBS + PAGE ACTIONS ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        {/* Title & Breadcrumb */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
            Customers
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
            <span
              onClick={() => navigate('/dashboard')}
              className="hover:text-slate-700 cursor-pointer transition-colors"
            >
              Home
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold">Customers</span>
          </div>
        </div>

        {/* Page Actions: Import, Export, + Add Customer */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Button 1: Import */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs rounded-xl flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 hover:border-slate-300 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import</span>
          </button>

          {/* Button 2: Export */}
          <button
            type="button"
            onClick={handleExport}
            className="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs rounded-xl flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 hover:border-slate-300 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export</span>
          </button>

          {/* Button 3: + Add Customer (Primary CTA) */}
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setSelectedCustomerForEdit(null);
                setIsFormModalOpen(true);
              }}
              className="h-10 px-4 bg-primary-600 hover:bg-primary-700 text-white shadow-2xs rounded-xl flex items-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. FIVE SUMMARY CARDS ROW */}
      <CustomerSummaryCards
        totalCustomers={totalCustomers}
        activeCustomers={activeCustomers}
        newThisMonth={stats?.newThisMonth ?? 0}
        withWarranty={stats?.withWarranty ?? 0}
        dueForService={stats?.dueForService ?? 0}
      />

      {/* 4. CUSTOMER SEARCH & FILTER TOOLBAR */}
      <CustomerToolbar
        search={search}
        onSearchChange={handleSearchChange}
        status={statusFilter}
        onStatusChange={handleStatusChange}
        customerType={customerTypeFilter}
        onCustomerTypeChange={handleCustomerTypeChange}
        customerLabel={customerLabelFilter}
        onCustomerLabelChange={handleCustomerLabelChange}
        city={cityFilter}
        onCityChange={handleCityChange}
        onRefresh={handleRefresh}
      />

      {/* 5. MAIN TWO-COLUMN WORKSPACE (Left Table / Right Customer Overview Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Table + Pagination) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <CustomerTable
            customers={customerList}
            selectedCustomerId={selectedCustomer?.id || ''}
            onSelectCustomer={handleSelectCustomer}
            onViewProfile={handleViewProfile}
            isLoading={isLoading}
          />

          <CustomerPagination
            currentPage={page}
            totalCustomers={totalCustomers}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>

        {/* Right Column (Customer Overview Card) */}
        <div className="lg:col-span-4 flex flex-col">
          {selectedCustomer && (
            <CustomerDetailsPanel
              customer={selectedCustomer}
              onViewFullProfile={handleViewProfile}
            />
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        customer={selectedCustomerForEdit}
        onSuccess={handleCustomerCreated}
      />

      {/* Import Customer Modal */}
      <CustomerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setPage(1);
          refetch();
        }}
      />

      {/* Archive Confirmation Dialog */}
      <CustomerArchiveDialog
        isOpen={!!selectedCustomerForArchive}
        onClose={() => setSelectedCustomerForArchive(null)}
        customer={selectedCustomerForArchive}
      />
    </div>
  );
};
