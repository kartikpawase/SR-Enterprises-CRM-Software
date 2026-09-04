import React from 'react';
import {
  Users,
  FileText,
  Wrench,
  ShoppingBag,
  Package,
  HardHat,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatNumber, formatDate } from '../../../lib/formatters';

interface ReportRecordsTableProps {
  type: 'customers' | 'invoices' | 'services' | 'sales' | 'technicians' | 'products';
  data: any[];
  isLoading?: boolean;
}

export const ReportRecordsTable: React.FC<ReportRecordsTableProps> = ({
  type,
  data = [],
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredData = React.useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter((item) => {
      if (type === 'customers') {
        return (
          item.fullName?.toLowerCase().includes(q) ||
          item.phone?.toLowerCase().includes(q) ||
          item.customerNumber?.toLowerCase().includes(q)
        );
      }
      if (type === 'invoices') {
        return (
          item.invoiceNumber?.toLowerCase().includes(q) ||
          item.customer?.fullName?.toLowerCase().includes(q) ||
          item.status?.toLowerCase().includes(q)
        );
      }
      if (type === 'services') {
        return (
          item.jobCardNumber?.toLowerCase().includes(q) ||
          item.customerName?.toLowerCase().includes(q) ||
          item.technicianName?.toLowerCase().includes(q) ||
          item.status?.toLowerCase().includes(q)
        );
      }
      if (type === 'sales') {
        return (
          item.saleNumber?.toLowerCase().includes(q) ||
          item.customerName?.toLowerCase().includes(q) ||
          item.status?.toLowerCase().includes(q)
        );
      }
      if (type === 'technicians') {
        return (
          item.fullName?.toLowerCase().includes(q) ||
          item.phone?.toLowerCase().includes(q) ||
          item.status?.toLowerCase().includes(q)
        );
      }
      if (type === 'products') {
        return (
          item.name?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, searchTerm, type]);

  const getTitleInfo = () => {
    switch (type) {
      case 'customers':
        return {
          title: 'Live Customer Accounts',
          subtitle: 'Active accounts registered across CRM directory',
          icon: Users,
          iconBg: 'bg-indigo-50 text-indigo-600',
          viewAllLink: '/customers',
        };
      case 'invoices':
        return {
          title: 'Live Invoices & Billing Records',
          subtitle: 'All customer invoices issued, paid, and overdue',
          icon: FileText,
          iconBg: 'bg-primary-50 text-primary-600',
          viewAllLink: '/invoices',
        };
      case 'services':
        return {
          title: 'Live Service Tickets & Job Cards',
          subtitle: 'Field operations dispatch and maintenance log',
          icon: Wrench,
          iconBg: 'bg-emerald-50 text-emerald-600',
          viewAllLink: '/services',
        };
      case 'sales':
        return {
          title: 'Live Sales Orders Log',
          subtitle: 'Customer purchases and equipment sales history',
          icon: ShoppingBag,
          iconBg: 'bg-purple-50 text-purple-600',
          viewAllLink: '/sales',
        };
      case 'technicians':
        return {
          title: 'Live Field Technician Directory',
          subtitle: 'Workforce status and current job assignments',
          icon: HardHat,
          iconBg: 'bg-indigo-50 text-indigo-600',
          viewAllLink: '/technicians',
        };
      case 'products':
        return {
          title: 'Live Product Catalog Items',
          subtitle: 'Equipment, purifiers, filters, and spare parts',
          icon: Package,
          iconBg: 'bg-blue-50 text-blue-600',
          viewAllLink: '/sales',
        };
    }
  };

  const info = getTitleInfo();
  const Icon = info.icon;

  return (
    <div className="space-y-3">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${info.iconBg} flex items-center justify-center border border-slate-200/80 shadow-2xs`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">{info.title}</h3>
            <p className="text-xs text-slate-500 font-sans">{info.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${type}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-2xs"
            />
          </div>

          <Link
            to={info.viewAllLink}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shrink-0 shadow-2xs"
          >
            <span>Open {type.charAt(0).toUpperCase() + type.slice(1)}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {type === 'customers' && (
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Address / Location</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      No customer records found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <Link to={`/customers/${c.id}`} className="hover:text-primary-600 hover:underline">
                          {c.fullName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {c.addressLine1 || c.city || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {c.customerType || 'INDIVIDUAL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {c.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatDate(c.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {type === 'invoices' && (
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No invoice records found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {inv.customer?.fullName || inv.customerName || 'Customer'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{formatDate(inv.createdAt)}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{inv.status === 'PAID' || parseFloat(inv.outstandingAmount || '0') <= 0 ? '—' : (inv.dueDate ? formatDate(inv.dueDate) : '—')}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(Number(inv.totalAmount || 0))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(Number(inv.paidAmount || 0))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'OVERDUE'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {type === 'services' && (
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket / Job #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Problem / Scope</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No service ticket records found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {job.jobCardNumber || job.ticketNumber || `JOB-${job.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{job.customerName || 'Customer'}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{job.problemReported || job.serviceType || 'Maintenance'}</td>
                      <td className="py-3 px-4 text-slate-700">{job.technicianName || 'Unassigned'}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            job.priority === 'URGENT'
                              ? 'bg-rose-50 text-rose-700'
                              : job.priority === 'HIGH'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {job.priority || 'NORMAL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {job.status || 'SCHEDULED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatDate(job.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {type === 'sales' && (
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Sale #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Sale Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      No sales order records found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600">
                        {s.saleNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{s.customerName}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{formatDate(s.saleDate || s.createdAt)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(Number(s.totalAmount || 0))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
