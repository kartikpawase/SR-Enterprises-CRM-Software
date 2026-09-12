import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { InteractiveAreaLineChart } from '../charts/InteractiveAreaLineChart';
import { formatCurrency, formatNumber } from '../../../lib/formatters';
import type { ChartDataPoint, ChartTimeframe } from '../reports.types';
import type { AnalyticsOverview } from '@crm/types';

interface RevenueSalesSectionProps {
  overview?: AnalyticsOverview;
  chartData?: ChartDataPoint[];
}

export const RevenueSalesSection: React.FC<RevenueSalesSectionProps> = ({ overview, chartData }) => {
  const [metricMode, setMetricMode] = useState<'revenue' | 'sales' | 'both'>('both');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('30D');

  // Convert real backend revenue trend from DB
  const realChartData: ChartDataPoint[] = React.useMemo(() => {
    if (chartData && chartData.length > 0) return chartData;
    if (!overview?.revenue?.revenueTrend?.length) return [];

    let points: ChartDataPoint[] = overview.revenue.revenueTrend.map((r: any) => ({
      date: r.date,
      revenue: r.billed ?? 0,
      sales: r.collected ?? 0,
    }));

    // Filter points based on chosen timeframe
    if (timeframe === '7D') {
      points = points.slice(-7);
    } else if (timeframe === '30D') {
      points = points.slice(-30);
    } else if (timeframe === '3M') {
      points = points.slice(-90);
    } else if (timeframe === '6M') {
      points = points.slice(-180);
    }

    return points;
  }, [overview, chartData, timeframe]);

  const grossBilled = overview?.revenue?.grossBilled ?? 0;
  const billedDelta = overview?.kpis?.grossBilled?.deltaPercentage ?? 0;
  const salesCount = overview?.sales?.salesCount ?? 0;
  const salesDelta = overview?.sales?.comparison?.count?.deltaPercentage ?? 0;
  const avgSaleValue = overview?.sales?.averageSaleValue ?? 0;
  const serviceSlaRate = overview?.services?.completionRate ?? 0;
  const outstandingAmount = overview?.revenue?.outstandingAmount ?? 0;
  const outstandingDelta = overview?.kpis?.outstandingAmount?.deltaPercentage ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Left Area/Line Chart Card (8 cols) */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">Revenue &amp; Realization Trajectory</h2>
            <p className="text-xs text-slate-500 font-sans">
              Real-time billing volume and cash collection timeline
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMetricMode('revenue')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricMode === 'revenue' ? 'bg-white text-primary-600 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Billed
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('sales')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricMode === 'sales' ? 'bg-white text-emerald-600 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Collected
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('both')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricMode === 'both' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Both
              </button>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center bg-slate-50 p-0.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600">
              {(['7D', '30D', '3M', '6M', '1Y'] as ChartTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    timeframe === tf ? 'bg-primary-600 text-white font-bold' : 'hover:bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive SVG Trend Chart */}
        <div className="pt-4 flex-1 flex items-center justify-center">
          <InteractiveAreaLineChart
            data={realChartData}
            metricMode={metricMode}
            height={250}
            isSalesCurrency={true}
            revenueLabel="Billed"
            salesLabel="Collected"
          />
        </div>

        {/* Legend Footer */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium font-sans">
              <span className="w-3 h-1 rounded-full bg-primary-600" /> Billed Revenue (₹)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium font-sans">
              <span className="w-3 h-1 rounded-full bg-emerald-500" /> Realized Cash (₹)
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            {realChartData.length} data points tracked
          </span>
        </div>
      </div>

      {/* Right Column: 4 Live Operational Performance Cards (4 cols) */}
      <div className="lg:col-span-4 flex flex-col justify-between gap-3">
        {/* Card 1: Gross Revenue */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">Gross Billed</span>
            <span className="text-sm font-extrabold text-slate-900 font-mono">{formatCurrency(grossBilled)}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Growth vs previous</span>
            <span className={`font-bold font-mono ${billedDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {billedDelta >= 0 ? `+${billedDelta}%` : `${billedDelta}%`}
            </span>
          </div>
        </div>

        {/* Card 2: Units Sold & Velocity */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">Sales Volume</span>
            <span className="text-sm font-extrabold text-slate-900 font-mono">{formatNumber(salesCount)} Units</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Avg ticket value</span>
            <span className="font-bold text-slate-800 font-mono">{formatCurrency(avgSaleValue)}</span>
          </div>
        </div>

        {/* Card 3: Service Resolution Rate */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">Service SLA Rate</span>
            <span className="text-sm font-extrabold text-emerald-700 font-mono">{serviceSlaRate}%</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Field completion efficiency</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> Target &gt;90%
            </span>
          </div>
        </div>

        {/* Card 4: Outstanding Balance */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">Outstanding Dues</span>
            <span className="text-sm font-extrabold text-amber-700 font-mono">{formatCurrency(outstandingAmount)}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Uncollected balance</span>
            <span className="font-bold font-mono text-amber-700">
              {outstandingDelta !== 0 ? `${outstandingDelta}%` : 'Stable'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
