import React from 'react';
import { WalletCards, FileText, AlertTriangle } from 'lucide-react';
import { DonutChart, type DonutSegment } from '../charts/DonutChart';
import { InteractiveAreaLineChart } from '../charts/InteractiveAreaLineChart';
import { formatCurrency, formatNumber } from '../../../lib/formatters';
import type { ChartDataPoint } from '../reports.types';
import type { RevenueAnalytics } from '@crm/types';

interface FinancialOverviewSectionProps {
  revenueData?: RevenueAnalytics;
}

export const FinancialOverviewSection: React.FC<FinancialOverviewSectionProps> = ({ revenueData }) => {
  const totalInvoices = revenueData?.totalInvoicesIssued ?? 0;
  const paidInvoices = revenueData?.paidInvoicesCount ?? 0;
  const overdueInvoices = revenueData?.overdueInvoicesCount ?? 0;
  const overdueAmount = revenueData?.overdueAmount ?? 0;
  const collectedAmount = revenueData?.amountCollected ?? 0;
  const outstandingAmount = revenueData?.outstandingAmount ?? 0;
  const paidRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

  const invoiceSegments: DonutSegment[] = [
    { id: 'paid', label: 'Paid', value: paidInvoices, formattedValue: `${paidInvoices} inv`, color: '#10B981' },
    { id: 'overdue', label: 'Overdue', value: overdueInvoices, formattedValue: `${overdueInvoices} inv`, color: '#EF4444' },
    {
      id: 'pending',
      label: 'Pending / Partial',
      value: Math.max(0, totalInvoices - paidInvoices - overdueInvoices),
      formattedValue: `${Math.max(0, totalInvoices - paidInvoices - overdueInvoices)} inv`,
      color: '#F59E0B',
    },
  ];

  const trendData: ChartDataPoint[] = revenueData?.revenueTrend?.length
    ? revenueData.revenueTrend.map((r: any) => ({
        date: r.date,
        revenue: r.collected ?? 0,
        sales: Math.max(0, (r.billed ?? 0) - (r.collected ?? 0)),
      }))
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <WalletCards className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Financial Overview</h2>
          <p className="text-xs text-slate-500">Invoice lifecycle status and realized cashflow realization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Invoice Status Distribution Donut (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Invoice Status Distribution</h3>
                <p className="text-[11px] text-slate-400">Total {formatNumber(totalInvoices)} invoices issued</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              {paidRate}% Paid
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center py-2">
            <DonutChart segments={invoiceSegments} totalLabel="Invoices" size={150} thickness={20} />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {overdueInvoices} Overdue ({formatCurrency(overdueAmount)})
            </span>
            <span>Realized: {formatCurrency(collectedAmount)}</span>
          </div>
        </div>

        {/* Right: Payment Collection Trend (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment Collection Trend</h3>
              <p className="text-[11px] text-slate-400">Cash realized vs Pending collection</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Realized (₹)
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending (₹)
              </span>
            </div>
          </div>

          <div className="pt-2 flex-1 flex items-center">
            <InteractiveAreaLineChart
              data={trendData}
              metricMode="both"
              height={200}
              isSalesCurrency={true}
              revenueLabel="Realized"
              salesLabel="Pending"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-medium">
              <span className="text-[10px] text-emerald-600 block">Collected</span>
              <span className="font-bold">{formatCurrency(collectedAmount)}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-800 font-medium">
              <span className="text-[10px] text-amber-600 block">Pending</span>
              <span className="font-bold">{formatCurrency(outstandingAmount)}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-800 font-medium">
              <span className="text-[10px] text-rose-600 block">Overdue</span>
              <span className="font-bold">{formatCurrency(overdueAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

