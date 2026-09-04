import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { DataTable, type ColumnDef } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useInvoicesQuery, type InvoiceSummaryData } from './invoices.api';
import { formatINR, formatDate } from '../../lib/formatters';
import {
  FileText,
  Eye,
  Calendar,
  User,
  ArrowUpRight,
  Plus,
  Download,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { InvoiceQueryFilter } from '@crm/validation';
import { useAuth } from '../../providers/AuthBoundary';

export const InvoiceDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('sales.create') || hasPermission('invoices.create');

  const [filters, setFilters] = useState<Partial<InvoiceQueryFilter>>({
    page: 1,
    limit: 10,
    search: '',
    status: undefined,
    sortBy: 'invoiceDate',
    sortOrder: 'desc',
  });

  const { data: response, isLoading } = useInvoicesQuery(filters);

  const invoices = response?.data || [];
  const pagination = response?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Calculate live KPI summary metrics from current result set
  const totalInvoicedSum = invoices.reduce((acc, inv) => acc + (parseFloat(inv.totalAmount) || 0), 0);
  const totalPaidSum = invoices.reduce((acc, inv) => acc + (parseFloat(inv.paidAmount) || 0), 0);
  const totalOutstandingSum = invoices.reduce((acc, inv) => acc + (parseFloat(inv.outstandingAmount) || 0), 0);
  const overdueCount = invoices.filter(
    (inv) => inv.dueDate && new Date(inv.dueDate) < new Date() && parseFloat(inv.outstandingAmount) > 0
  ).length;

  const handleExportCsv = () => {
    if (invoices.length === 0) return;
    const headers = [
      'Invoice Number',
      'Customer Name',
      'Customer Phone',
      'Customer Number',
      'Invoice Date',
      'Due Date',
      'Total Amount',
      'Paid Amount',
      'Outstanding Amount',
      'Status',
    ];
    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      `"${(inv.customerName || '').replace(/"/g, '""')}"`,
      inv.customerPhone || '',
      inv.customerNumber || '',
      formatDate(inv.invoiceDate || inv.createdAt),
      formatDate(inv.dueDate),
      inv.totalAmount,
      inv.paidAmount,
      inv.outstandingAmount,
      inv.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `invoices_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<InvoiceSummaryData>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (row: InvoiceSummaryData) => (
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/80 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div
              className="font-bold text-slate-900 hover:text-primary-600 cursor-pointer flex items-center gap-1 font-mono"
              onClick={() => navigate(`/invoices/${row.id}`)}
            >
              {row.invoiceNumber}
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3 text-slate-400" />
              {formatDate(row.invoiceDate || row.createdAt)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row: InvoiceSummaryData) => (
        <div>
          <div
            className="font-semibold text-slate-900 hover:text-primary-600 cursor-pointer flex items-center gap-1"
            onClick={() => row.customerId && navigate(`/customers/${row.customerId}`)}
          >
            <User className="w-3.5 h-3.5 text-slate-400" />
            {row.customerName || 'Direct / Walk-in Customer'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            <span className="font-mono">{row.customerPhone || 'N/A'}</span>
            {row.customerNumber && (
              <>
                {' '}• <span className="font-mono text-[11px] font-semibold">{row.customerNumber}</span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (row: InvoiceSummaryData) => {
        const isPaid = row.status === 'PAID' || parseFloat(row.outstandingAmount || '0') <= 0;
        if (isPaid) {
          return (
            <div className="text-xs font-mono text-slate-400">
              —
            </div>
          );
        }
        const isOverdue =
          row.dueDate &&
          new Date(row.dueDate) < new Date() &&
          parseFloat(row.outstandingAmount || '0') > 0;
        return (
          <div className="text-xs font-mono">
            <div className={`font-semibold ${isOverdue ? 'text-red-700 font-bold' : 'text-slate-700'}`}>
              {formatDate(row.dueDate)}
            </div>
            {isOverdue && <span className="text-[10px] text-red-600 font-bold uppercase">Overdue</span>}
          </div>
        );
      },
    },
    {
      key: 'totalAmount',
      header: 'Total Billed',
      render: (row: InvoiceSummaryData) => (
        <div className="font-bold text-slate-900 font-mono text-xs">
          {formatINR(row.totalAmount)}
        </div>
      ),
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      render: (row: InvoiceSummaryData) => {
        const outstanding = parseFloat(row.outstandingAmount || '0');
        return (
          <div
            className={`font-mono text-xs font-bold ${
              outstanding > 0 ? 'text-amber-800' : 'text-emerald-700'
            }`}
          >
            {outstanding > 0 ? formatINR(row.outstandingAmount) : 'Paid in Full'}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: InvoiceSummaryData) => {
        return <StatusBadge status={row.status} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: InvoiceSummaryData) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/invoices/${row.id}`)}
            leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 select-none">
      {/* 1. Page Header */}
      <PageHeader
        title="Invoices &amp; Billing"
        description="Authoritative GST tax invoices, billing snapshots, and outstanding receivables."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Invoices' }]}
        actions={
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download className="w-4 h-4 text-slate-500" />}
              disabled={invoices.length === 0}
            >
              Export CSV
            </Button>
            {canCreate && (
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={() => navigate('/sales/new')}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                New Sale &amp; Invoice
              </Button>
            )}
          </div>
        }
      />

      {/* 2. Top Metric KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoices */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Total Invoices</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{pagination.total}</div>
            <span className="text-3xs text-slate-400">Generated tax records</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Total Billed Revenue */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Total Billed</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">{formatINR(totalInvoicedSum)}</div>
            <span className="text-3xs text-slate-400">Across current results</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Total Received / Collected */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700">Total Collected</span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{formatINR(totalPaidSum)}</div>
            <span className="text-3xs text-emerald-600 font-medium">Reconciled payments</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-2xs font-bold uppercase tracking-wider text-amber-700">Outstanding Balance</span>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">{formatINR(totalOutstandingSum)}</div>
            <span className="text-3xs text-amber-600 font-medium">
              {overdueCount > 0 ? `${overdueCount} overdue invoices` : 'All accounts in order'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            {overdueCount > 0 ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-96">
          <SearchInput
            placeholder="Search invoice #, customer name, or phone..."
            value={filters.search || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            onClear={() => setFilters((prev) => ({ ...prev, search: '', page: 1 }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="w-44">
            <Select
              options={[
                { value: '', label: 'All Invoices' },
                { value: 'ISSUED', label: 'Not Paid' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                { value: 'PAID', label: 'Paid' },
                { value: 'OVERDUE', label: 'Overdue' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              value={filters.status || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: (e.target.value as any) || undefined,
                  page: 1,
                }))
              }
            />
          </div>

          <div className="w-44">
            <Select
              options={[
                { value: 'invoiceDate:desc', label: 'Newest Invoices' },
                { value: 'invoiceDate:asc', label: 'Oldest Invoices' },
                { value: 'totalAmount:desc', label: 'Highest Amount' },
                { value: 'totalAmount:asc', label: 'Lowest Amount' },
              ]}
              value={`${filters.sortBy || 'invoiceDate'}:${filters.sortOrder || 'desc'}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split(':');
                setFilters((prev) => ({ ...prev, sortBy: sortBy as any, sortOrder: sortOrder as any, page: 1 }));
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. Main Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <DataTable<InvoiceSummaryData>
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          keyExtractor={(item) => item.id}
          pagination={{
            page: pagination.page,
            pageSize: pagination.limit || 10,
            total: pagination.total,
          }}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          emptyTitle="No invoices found"
          emptyDescription={
            filters.search || filters.status
              ? 'No invoices match the current search or filters.'
              : 'Invoices are automatically generated when sales orders are confirmed.'
          }
        />
      </div>
    </div>
  );
};
