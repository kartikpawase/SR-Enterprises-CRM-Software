import React from 'react';
import { ShoppingCart, ShoppingBag, Layers, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface SalesKpiData {
  totalSales: string;
  totalSalesTrend: string;
  orders: number;
  ordersTrend: string;
  avgOrderValue: string;
  avgOrderTrend: string;
  completed: number;
  completedTrend: string;
  pending: number;
  pendingTrend: string;
}

interface SalesKpiCardsProps {
  data?: Partial<SalesKpiData>;
}

function parseMetricNumber(val: string | number): number {
  if (typeof val === 'number') return val;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseTrendPercent(trend: string): number {
  const cleaned = trend.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function getSparklinePath(val: string | number, trend: string): string {
  const num = parseMetricNumber(val);
  if (num <= 0) {
    // Perfectly flat baseline when metric value is 0
    return 'M 0 16 L 50 16';
  }
  const t = parseTrendPercent(trend);
  if (t > 0) {
    return 'M 0 16 Q 14 15, 28 8 T 50 4';
  }
  if (t < 0) {
    return 'M 0 5 Q 15 8, 30 13 T 50 16';
  }
  return 'M 0 10 L 50 10';
}

export const SalesKpiCards: React.FC<SalesKpiCardsProps> = ({ data }) => {
  const kpis: SalesKpiData = {
    totalSales: data?.totalSales ?? '₹ 0.00',
    totalSalesTrend: data?.totalSalesTrend ?? '0%',
    orders: data?.orders ?? 0,
    ordersTrend: data?.ordersTrend ?? '0%',
    avgOrderValue: data?.avgOrderValue ?? '₹ 0.00',
    avgOrderTrend: data?.avgOrderTrend ?? '0%',
    completed: data?.completed ?? 0,
    completedTrend: data?.completedTrend ?? '0%',
    pending: data?.pending ?? 0,
    pendingTrend: data?.pendingTrend ?? '0%',
  };

  const renderTrendBadge = (val: string | number, trend: string) => {
    const num = parseMetricNumber(val);
    const t = parseTrendPercent(trend);

    if (num <= 0 || t === 0) {
      return (
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <span>{trend}</span>
          <span className="text-slate-400 font-normal text-[10px]">vs last month</span>
        </div>
      );
    }

    if (t > 0) {
      return (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{trend}</span>
          <span className="text-slate-400 font-normal text-[10px]">vs last month</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
        <ArrowDownRight className="w-3.5 h-3.5" />
        <span>{trend}</span>
        <span className="text-slate-400 font-normal text-[10px]">vs last month</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
      {/* 1. Total Sales */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium block truncate">Total Sales</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight block truncate">{kpis.totalSales}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {renderTrendBadge(kpis.totalSales, kpis.totalSalesTrend)}
          <svg className="w-12 sm:w-14 h-5 overflow-visible shrink-0" viewBox="0 0 50 20" fill="none">
            <path
              d={getSparklinePath(kpis.totalSales, kpis.totalSalesTrend)}
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 2. Orders */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium block truncate">Orders</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight block truncate">{kpis.orders}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {renderTrendBadge(kpis.orders, kpis.ordersTrend)}
          <svg className="w-12 sm:w-14 h-5 overflow-visible shrink-0" viewBox="0 0 50 20" fill="none">
            <path
              d={getSparklinePath(kpis.orders, kpis.ordersTrend)}
              stroke="#8B5CF6"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 3. Avg. Order Value */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium block truncate">Avg. Order Value</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight block truncate">{kpis.avgOrderValue}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {renderTrendBadge(kpis.avgOrderValue, kpis.avgOrderTrend)}
          <svg className="w-12 sm:w-14 h-5 overflow-visible shrink-0" viewBox="0 0 50 20" fill="none">
            <path
              d={getSparklinePath(kpis.avgOrderValue, kpis.avgOrderTrend)}
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 4. Completed */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium block truncate">Completed</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight block truncate">{kpis.completed}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {renderTrendBadge(kpis.completed, kpis.completedTrend)}
          <svg className="w-12 sm:w-14 h-5 overflow-visible shrink-0" viewBox="0 0 50 20" fill="none">
            <path
              d={getSparklinePath(kpis.completed, kpis.completedTrend)}
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 5. Pending */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between last:col-span-2 sm:last:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium block truncate">Pending</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight block truncate">{kpis.pending}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {renderTrendBadge(kpis.pending, kpis.pendingTrend)}
          <svg className="w-12 sm:w-14 h-5 overflow-visible shrink-0" viewBox="0 0 50 20" fill="none">
            <path
              d={getSparklinePath(kpis.pending, kpis.pendingTrend)}
              stroke="#F97316"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
