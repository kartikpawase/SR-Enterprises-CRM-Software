import React from 'react';
import { Repeat, AlertTriangle, Clock, ShieldCheck, IndianRupee } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../../lib/formatters';
import type { RentalSummaryStats } from '../rentals.api';

export interface RentalKpiCardsProps {
  summary?: RentalSummaryStats;
  isLoading?: boolean;
}

export const RentalKpiCards: React.FC<RentalKpiCardsProps> = ({ summary, isLoading }) => {
  const activeCount = summary?.totalActive ?? 0;
  const dueCount = summary?.totalDue ?? 0;
  const overdueCount = summary?.totalOverdue ?? 0;
  const monthlyRunRate = summary?.monthlyRunRate ?? 0;
  const totalDeposits = summary?.totalDepositsHeld ?? 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5 select-none">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs animate-pulse">
            <div className="h-3 w-16 sm:w-20 bg-slate-200 rounded mb-2" />
            <div className="h-5 sm:h-6 w-20 sm:w-28 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5 select-none">
      {/* 1. Active Rentals */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[11px] sm:text-xs font-medium truncate">
          <Repeat className="w-3.5 h-3.5 text-primary-600 shrink-0" />
          <span className="truncate">Active Rented Machines</span>
        </div>
        <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 font-mono truncate">
          {formatNumber(activeCount)} <span className="text-xs font-normal text-slate-500 font-sans">Units</span>
        </div>
        <div className="text-[10px] sm:text-[11px] text-emerald-600 font-mono mt-0.5 truncate">
          Live active customer subscriptions
        </div>
      </div>

      {/* 2. Monthly Rental Run Rate */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[11px] sm:text-xs font-medium truncate">
          <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Monthly Rental Revenue</span>
        </div>
        <div className="text-lg sm:text-xl font-extrabold text-emerald-950 mt-1 font-mono truncate">
          {formatCurrency(monthlyRunRate)}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
          Recurring monthly run rate
        </div>
      </div>

      {/* 3. Due & Overdue Subscriptions */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[11px] sm:text-xs font-medium truncate">
          {overdueCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
          <span className="truncate">Payment Due / Overdue</span>
        </div>
        <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 font-mono truncate">
          {dueCount + overdueCount > 0 ? (
            <span className={overdueCount > 0 ? 'text-rose-700' : 'text-amber-700'}>
              {dueCount + overdueCount} <span className="text-[10px] sm:text-xs font-normal text-slate-500 font-sans">({overdueCount} overdue)</span>
            </span>
          ) : (
            <span className="text-emerald-700">0 Due</span>
          )}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
          Awaiting rental collections
        </div>
      </div>

      {/* 4. Security Deposits Held */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[11px] sm:text-xs font-medium truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="truncate">Security Deposits Held</span>
        </div>
        <div className="text-lg sm:text-xl font-extrabold text-teal-950 mt-1 font-mono truncate">
          {formatCurrency(totalDeposits)}
        </div>
        <div className="text-[10px] sm:text-[11px] text-teal-700 mt-0.5 font-mono truncate">
          Safe refundable collateral
        </div>
      </div>
    </div>
  );
};
