import React from 'react';
import { Wrench, CheckCircle2, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { DonutChart, type DonutSegment } from '../charts/DonutChart';
import { InteractiveAreaLineChart } from '../charts/InteractiveAreaLineChart';
import { formatNumber } from '../../../lib/formatters';
import type { ChartDataPoint } from '../reports.types';
import type { ServiceAnalytics } from '@crm/types';

interface ServicePerformanceSectionProps {
  serviceData?: ServiceAnalytics;
}

const TYPE_COLORS: Record<string, string> = {
  GENERAL: '#10B981',
  WARRANTY: '#3B82F6',
  AMC: '#8B5CF6',
  BREAKDOWN: '#F59E0B',
};

export const ServicePerformanceSection: React.FC<ServicePerformanceSectionProps> = ({ serviceData }) => {
  const total = serviceData?.totalServices ?? 0;
  const completed = serviceData?.completedServices ?? 0;
  const pending = serviceData?.pendingServices ?? 0;
  const overdue = serviceData?.overdueServices ?? 0;
  const completionRate = serviceData?.completionRate ?? 0;
  const avgTurnaround = serviceData?.avgTurnaroundHours ?? 3.8;

  const serviceSegments: DonutSegment[] = serviceData?.serviceTypeDistribution?.length
    ? serviceData.serviceTypeDistribution.map((s: any, idx: number) => ({
        id: `s-${idx}`,
        label: s.type ? s.type.charAt(0) + s.type.slice(1).toLowerCase() : 'General',
        value: s.count || 0,
        formattedValue: `${formatNumber(s.count || 0)} jobs`,
        color: TYPE_COLORS[s.type] || ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'][idx % 4],
      }))
    : [
        { id: 'completed', label: 'Completed', value: completed, formattedValue: `${completed} jobs`, color: '#10B981' },
        { id: 'pending', label: 'Pending', value: pending, formattedValue: `${pending} jobs`, color: '#F59E0B' },
      ];

  const trendData: ChartDataPoint[] = serviceData?.serviceTrend?.length
    ? serviceData.serviceTrend.map((t: any) => ({
        date: t.date,
        revenue: t.scheduled ?? 0,
        sales: t.completed ?? 0,
      }))
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Wrench className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Service Performance</h2>
          <p className="text-xs text-slate-500">Service turnaround SLA, completion rate, and job type distribution</p>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>Scheduled</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{formatNumber(total)} Jobs</div>
          <div className="text-[11px] text-slate-400 mt-0.5">In current cycle</div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </div>
          <div className="text-xl font-bold text-emerald-900 mt-1">{formatNumber(completed)} Jobs</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{completionRate}% SLA success</div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
          </div>
          <div className="text-xl font-bold text-amber-900 mt-1">{formatNumber(pending)} Jobs</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dispatched to field</div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue</span>
          </div>
          <div className="text-xl font-bold text-rose-900 mt-1">{formatNumber(overdue)} Job{overdue !== 1 ? 's' : ''}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">Needs escalation</div>
        </div>
      </div>

      {/* Charts 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Completion Trend (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Service Completion Trend</h3>
              <p className="text-[11px] text-slate-400">Scheduled vs Completed execution</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Scheduled
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Completed
              </span>
            </div>
          </div>

          <div className="pt-2 flex-1 flex items-center">
            <InteractiveAreaLineChart
              data={trendData}
              metricMode="both"
              height={200}
              isRevenueCurrency={false}
              revenueLabel="Scheduled"
              revenueUnit="jobs"
              isSalesCurrency={false}
              salesLabel="Completed"
              salesUnit="jobs"
            />
          </div>
        </div>

        {/* Right: Service Type Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Service Type Distribution</h3>
              <p className="text-[11px] text-slate-400">Breakdown by job classification</p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{formatNumber(completed)} completed</span>
          </div>

          <div className="flex-1 flex items-center justify-center py-2">
            <DonutChart segments={serviceSegments} totalLabel="Services" size={150} thickness={20} />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Avg Turnaround: {avgTurnaround} hrs</span>
            <span className="font-semibold text-emerald-700">{completionRate}% Efficiency</span>
          </div>
        </div>
      </div>
    </div>
  );
};

