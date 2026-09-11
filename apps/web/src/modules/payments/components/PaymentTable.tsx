import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Pagination } from '../../../components/ui/Pagination';
import { formatINR, formatDate } from '../../../lib/formatters';
import type { PaymentItem } from '../payments.api';
import {
  Receipt,
  FileText,
  User,
  Phone,
  Ban,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PaymentTableProps {
  payments: PaymentItem[];
  isLoading: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onViewReceipt: (payment: PaymentItem) => void;
  onCancelPayment: (payment: PaymentItem) => void;
  onRecordPaymentForInvoice?: (invoiceId: string) => void;
}

export const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  isLoading,
  pagination,
  onPageChange,
  onViewReceipt,
  onCancelPayment,
  onRecordPaymentForInvoice,
}) => {
  const getStatusBadge = (status?: PaymentItem['status'] | string) => {
    const s = (status || 'COMPLETED').toUpperCase();
    switch (s) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            Partially Paid
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Pending
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Refunded
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {s}
          </span>
        );
    }
  };

  const getMethodBadge = (method?: PaymentItem['paymentMethod'] | string) => {
    const m = (method || 'UPI').toUpperCase();
    switch (m) {
      case 'UPI':
        return <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">UPI</span>;
      case 'CASH':
        return <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">CASH</span>;
      case 'CARD':
        return <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">CARD</span>;
      case 'BANK_TRANSFER':
        return <span className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">NEFT/RTGS</span>;
      case 'CHEQUE':
        return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">CHEQUE</span>;
      case 'PENDING':
        return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">DUE / UNPAID</span>;
      default:
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{m}</span>;
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading financial payment records...</p>
        </div>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No payment records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No payments match your active filter criteria. Record a customer payment against an issued invoice to start tracking collections.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Payment / Dues Ref</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Invoice Ref</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Method & Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {payments.map((p) => {
              const isPendingOrPartial =
                p.status !== 'COMPLETED' &&
                (p.status === 'PENDING' ||
                  p.status === ('PARTIALLY_PAID' as any) ||
                  p.paymentNumber?.startsWith('DUE-'));

              return (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Payment Reference & Notes */}
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold text-xs ${isPendingOrPartial ? 'text-amber-700' : 'text-primary-700'}`}>
                        {p.paymentNumber}
                      </span>
                    </div>
                    {p.referenceNumber && (
                      <p className="text-[11px] text-slate-500 font-mono">{p.referenceNumber}</p>
                    )}
                    {p.notes && (
                      <p className="text-[11px] text-slate-500 italic max-w-xs truncate" title={p.notes}>
                        {p.notes}
                      </p>
                    )}
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <Link
                        to={`/customers/${p.customerId}`}
                        className="font-medium text-slate-900 hover:text-primary-600 flex items-center gap-1"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {p.customerName}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {p.customerPhone}
                        </span>
                        {p.customerNumber && (
                          <span className="font-mono text-[10px] text-slate-400">({p.customerNumber})</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Invoice Ref */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <Link
                        to={`/invoices/${p.invoiceId}`}
                        className="font-mono text-xs font-semibold text-slate-800 hover:text-primary-600 flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {p.invoiceNumber}
                      </Link>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span>Total: {formatINR(p.invoiceTotal)}</span>
                        {p.invoiceStatus && (
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            p.invoiceStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                            p.invoiceStatus === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {p.invoiceStatus.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4">
                    <div className={`font-mono text-sm font-bold ${isPendingOrPartial ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatINR(p.amount)}
                    </div>
                    {isPendingOrPartial && (
                      <span className="text-[10px] text-amber-600 font-medium">Pending Due</span>
                    )}
                  </td>

                  {/* Method & Date & Collector */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <div>{getMethodBadge(p.paymentMethod)}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {p.paymentDate ? formatDate(p.paymentDate) : 'N/A'}
                      </div>
                      {p.receivedByName && (
                        <div className="text-[10px] text-slate-400">
                          By: <span className="font-medium text-slate-600">{p.receivedByName}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(p.status)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isPendingOrPartial ? (
                        <>
                          <button
                            onClick={() => onRecordPaymentForInvoice?.(p.invoiceId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs shadow-2xs transition-colors"
                            title="Record Payment for this invoice"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Record Payment
                          </button>
                          <Link
                            to={`/invoices/${p.invoiceId}`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium text-xs transition-colors"
                            title="View Invoice"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Link>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onViewReceipt(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-primary-600 font-medium text-xs shadow-2xs transition-colors"
                            title="View & Print Official Receipt"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Receipt
                          </button>

                          {p.status === 'COMPLETED' && (
                            <button
                              onClick={() => onCancelPayment(p)}
                              className="inline-flex items-center p-1.5 rounded-lg border border-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Cancel / Reverse Payment"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="border-t border-slate-200 px-4 py-3 bg-white">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
            totalItems={pagination.total}
            pageSize={pagination.limit}
          />
        </div>
      )}
    </Card>
  );
};
