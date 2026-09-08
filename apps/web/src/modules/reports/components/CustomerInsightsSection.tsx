import React from 'react';
import { Users, UserPlus, UserCheck, Clock } from 'lucide-react';
import { DonutChart, type DonutSegment } from '../charts/DonutChart';
import { InteractiveAreaLineChart } from '../charts/InteractiveAreaLineChart';
import { formatNumber } from '../../../lib/formatters';
import type { ChartDataPoint } from '../reports.types';
import type { CustomerAnalytics } from '@crm/types';

interface CustomerInsightsSectionProps {
  customerData?: CustomerAnalytics;
}

export const CustomerInsightsSection: React.FC<CustomerInsightsSectionProps> = ({ customerData }) => {
  const totalCustomers = customerData?.totalCustomers ?? 0;
  const activeCustomers = customerData?.activeCustomers ?? 0;
  const newCustomers = customerData?.newCustomers ?? 0;
  const serviceDue = customerData?.customersWithActiveServices ?? 0;
  const activeRate = totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0;

  const customerSegments: DonutSegment[] = customerData?.customerTypeDistribution?.length
    ? customerData.customerTypeDistribution.map((t: any, idx: number) => ({
        id: `c-${idx}`,
        label: t.type ? t.type.charAt(0) + t.type.slice(1).toLowerCase() : 'Individual',
        value: t.count || 0,
        formattedValue: `${formatNumber(t.count || 0)} cust`,
        color: idx === 0 ? '#10B981' : idx === 1 ? '#3B82F6' : '#F59E0B',
      }))
    : [];

  const growthTrend: ChartDataPoint[] = customerData?.acquisitionTrend?.length
    ? customerData.acquisitionTrend.map((a: any) => ({
        date: a.date,
        revenue: 0,
        sales: a.value ?? 0,
      }))
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Customer Insights</h2>
          <p className="text-xs text-slate-500">Customer acquisition trajectory and account lifecycle distribution</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Card 1: Customer Growth (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Customer Base Growth</h3>
              <p className="text-[11px] text-slate-400">Total active accounts expansion</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
              <UserPlus className="w-3.5 h-3.5" /> +{newCustomers} New This Period
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 block">Total Base</span>
              <span className="text-sm font-bold text-slate-900">{formatNumber(totalCustomers)}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-center">
              <span className="text-[10px] text-emerald-700 block">Active</span>
              <span className="text-sm font-bold text-emerald-800">{formatNumber(activeCustomers)}</span>
            </div>
            <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-center">
              <span className="text-[10px] text-blue-700 block">New Adds</span>
              <span className="text-sm font-bold text-blue-800">{formatNumber(newCustomers)}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100 text-center">
              <span className="text-[10px] text-amber-700 block">Service Due</span>
              <span className="text-sm font-bold text-amber-800">{formatNumber(serviceDue)}</span>
            </div>
          </div>

          <div className="pt-2 flex-1 flex items-center">
            <InteractiveAreaLineChart data={growthTrend} metricMode="sales" height={190} />
          </div>
        </div>

        {/* Card 2: Customer Distribution Donut (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer Distribution</h3>
                <p className="text-[11px] text-slate-400">Lifecycle segmentation</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{formatNumber(totalCustomers)} total</span>
          </div>

          <div className="flex-1 flex items-center justify-center py-2">
            <DonutChart segments={customerSegments} totalLabel="Customers" size={160} thickness={20} />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> {serviceDue} require routine service
            </span>
            <span className="font-semibold text-slate-700">{activeRate}% Active Rate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

