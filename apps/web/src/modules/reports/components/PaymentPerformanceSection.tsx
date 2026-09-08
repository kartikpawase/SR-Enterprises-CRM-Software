import React from 'react';
import { WalletCards, CreditCard, Banknote, Building2, CheckCircle2, TrendingUp } from 'lucide-react';
import { DonutChart, type DonutSegment } from '../charts/DonutChart';
import { InteractiveAreaLineChart } from '../charts/InteractiveAreaLineChart';
import { formatCurrency, formatNumber } from '../../../lib/formatters';
import type { ChartDataPoint } from '../reports.types';
import type { PaymentAnalytics, RevenueAnalytics } from '@crm/types';

interface PaymentPerformanceSectionProps {
  paymentData?: PaymentAnalytics;
  revenueData?: RevenueAnalytics;
}

const METHOD_COLORS: Record<string, string> = {
  UPI: '#0284C7',
  CASH: '#10B981',
  BANK_TRANSFER: '#6366F1',
  CHEQUE: '#F59E0B',
  CARD: '#EC4899',
};

export const PaymentPerformanceSection: React.FC<PaymentPerformanceSectionProps> = ({
  paymentData,
  revenueData,
}) => {
  const totalCollected = paymentData?.totalPayments ?? revenueData?.amountCollected ?? 0;
  const paymentCount = paymentData?.paymentCount ?? 0;
  const avgAmount = paymentData?.averagePaymentAmount ?? (paymentCount > 0 ? Math.round(totalCollected / paymentCount) : 0);
  const outstanding = revenueData?.outstandingAmount ?? 0;
  const collectionRate = revenueData?.collectionRate ?? (totalCollected + outstanding > 0 ? Math.round((totalCollected / (totalCollected + outstanding)) * 100) : 100);

  const methodSegments: DonutSegment[] = paymentData?.paymentMethodDistribution?.length
    ? paymentData.paymentMethodDistribution.map((m: any, idx: number) => ({
        id: `m-${idx}`,
        label: m.method ? m.method.replace(/_/g, ' ') : 'UPI',
        value: m.totalAmount || m.count || 0,
        formattedValue: formatCurrency(m.totalAmount || 0),
        color: METHOD_COLORS[m.method] || ['#0284C7', '#10B981', '#6366F1', '#F59E0B'][idx % 4],
      }))
    : [];

  const trendData: ChartDataPoint[] = paymentData?.collectionTrend?.length
    ? paymentData.collectionTrend.map((t: any) => ({
        date: t.date,
        revenue: t.value ?? 0,
        sales: t.secondaryValue ?? 0,
      }))
    : revenueData?.revenueTrend?.length
    ? revenueData.revenueTrend.map((r: any) => ({
        date: r.date,
        revenue: r.collected ?? 0,
        sales: 0,
      }))
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
          <WalletCards className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 font-display">Payment Collections &amp; Cashflow</h2>
          <p className="text-xs text-slate-500 font-sans">Payment gateway distribution, settlement volume, and collection velocity</p>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium font-sans">
            <CreditCard className="w-3.5 h-3.5 text-primary-600" />
            <span>Total Collected</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{formatCurrency(totalCollected)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">Realized in account</div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium font-sans">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transactions</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1 font-mono">{formatNumber(paymentCount)} Receipts</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5 font-mono">{collectionRate}% collection rate</div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium font-sans">
            <Banknote className="w-3.5 h-3.5 text-indigo-600" />
            <span>Avg Transaction</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{formatCurrency(avgAmount)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-sans">Average ticket payment</div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium font-sans">
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Receivables</span>
          </div>
          <div className="text-xl font-extrabold text-amber-900 mt-1 font-mono">{formatCurrency(outstanding)}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5 font-sans">Uncollected invoices</div>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Payment Method Distribution Donut (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Payment Channels</h3>
                <p className="text-[11px] text-slate-400 font-sans">Distribution by settlement method</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-700 font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
              {paymentCount} Total
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center py-2">
            <DonutChart segments={methodSegments} totalLabel="Collections" size={150} thickness={20} />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-sans">
            <span className="font-semibold text-slate-700">UPI, Cash &amp; Bank IMPS</span>
            <span className="font-bold text-emerald-700 font-mono">{formatCurrency(totalCollected)} Realized</span>
          </div>
        </div>

        {/* Right: Payment Collection Trajectory Trend (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Collection Velocity</h3>
              <p className="text-[11px] text-slate-400 font-sans">Real-time daily realized cash intake</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{formatCurrency(totalCollected)} Realized</span>
            </div>
          </div>

          <div className="pt-2 flex-1 flex items-center justify-center">
            <InteractiveAreaLineChart data={trendData} metricMode="revenue" height={220} />
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 font-medium">
              <span className="text-[10px] text-emerald-600 block font-sans">Collected Receipts</span>
              <span className="font-bold font-mono text-sm">{formatCurrency(totalCollected)}</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800 font-medium">
              <span className="text-[10px] text-amber-600 block font-sans">Outstanding Receivables</span>
              <span className="font-bold font-mono text-sm">{formatCurrency(outstanding)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
