import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Pagination } from '../../../components/ui/Pagination';
import { formatINR, formatDate } from '../../../lib/formatters';
import type { RentalPaymentListItem } from '../../rentals/rentals.api';
import {
  Receipt,
  User,
  Phone,
  Calendar,
  CreditCard,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface RentalPaymentTableProps {
  payments: RentalPaymentListItem[];
  isLoading: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onViewReceipt: (payment: RentalPaymentListItem) => void;
}

export const RentalPaymentTable: React.FC<RentalPaymentTableProps> = ({
  payments,
  isLoading,
  pagination,
  onPageChange,
  onViewReceipt,
}) => {
  const getPaymentTypeBadge = (type?: string) => {
    if (!type) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
          General
        </span>
      );
    }
    switch (type) {
      case 'MONTHLY_RENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Monthly Rent
          </span>
        );
      case 'SECURITY_DEPOSIT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            Security Deposit
          </span>
        );
      case 'ADVANCE_RENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Advance Rent
          </span>
        );
      case 'DAMAGE_CHARGE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Damage Charge
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
            {String(type).replace(/_/g, ' ')}
          </span>
        );
    }
  };

  const getMethodBadge = (method?: string) => {
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
      default:
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{m}</span>;
    }
  };

  const getRentalStatusBadge = (status?: string) => {
    const s = (status || 'ACTIVE').toUpperCase();
    switch (s) {
      case 'PAID':
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
            {s}
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
            Partially Paid
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
            Overdue
          </span>
        );
      case 'RETURNED':
      case 'COMPLETED':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
            {s}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading rental payment records...</p>
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
          <h3 className="text-sm font-semibold text-slate-900">No rental payments found.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No rental payments match your active filter criteria. Record payments from the Rent module to populate this ledger.
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
              <th className="py-3 px-4">Receipt / Payment ID</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Rental Agreement</th>
              <th className="py-3 px-4">Amount Paid</th>
              <th className="py-3 px-4">Method & Date</th>
              <th className="py-3 px-4">Remaining Balance</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {payments.map((p) => {
              const outstandingNum = Number(p.outstandingAmount || 0);

              return (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Receipt / Payment Reference */}
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {p.receiptNumber}
                      </span>
                    </div>
                    <div className="mt-1">
                      {getPaymentTypeBadge(p.paymentType)}
                    </div>
                    {p.referenceNumber && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Ref: {p.referenceNumber}</p>
                    )}
                    {p.notes && (
                      <p className="text-[11px] text-slate-500 italic max-w-xs truncate mt-0.5" title={p.notes}>
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

                  {/* Rental Agreement & Machine */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <div className="font-mono text-xs font-semibold text-slate-800 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {p.rentalNumber}
                      </div>
                      <div className="text-[11px] font-medium text-slate-700">
                        {p.machineModel}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        SN: <span className="text-purple-700 font-semibold">{p.serialNumber}</span>
                      </div>
                    </div>
                  </td>

                  {/* Amount Paid */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-sm font-bold text-emerald-700">
                      {formatINR(Number(p.amount))}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Monthly Rent: {formatINR(Number(p.monthlyRent))}
                    </div>
                  </td>

                  {/* Method & Date */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <div>{getMethodBadge(p.paymentMethod)}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {p.paymentDate ? formatDate(p.paymentDate) : 'N/A'}
                      </div>
                      {p.recordedByName && (
                        <div className="text-[10px] text-slate-400">
                          By: <span className="font-medium text-slate-600">{p.recordedByName}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Remaining Balance & Next Due Date */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <div className={`font-mono text-xs font-bold ${outstandingNum > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                        {formatINR(outstandingNum)}
                      </div>
                      <div>
                        {getRentalStatusBadge(p.paymentStatus || p.rentalStatus)}
                      </div>
                      {p.nextDueDate && (
                        <div className="text-[10px] text-slate-500">
                          Due: {formatDate(p.nextDueDate)}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onViewReceipt(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-primary-600 font-medium text-xs shadow-2xs transition-colors cursor-pointer"
                      title="View & Print Official Receipt"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Receipt
                    </button>
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
