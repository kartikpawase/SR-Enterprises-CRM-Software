import React from 'react';
import { Wrench, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ActivityCurve } from '../../dashboard/components/ActivityCurve';
import type { ServiceKPIs, ServiceItem } from '../services.api';

export interface ServiceSummaryCardsProps {
  kpis?: ServiceKPIs;
  services?: ServiceItem[];
  isLoading?: boolean;
}

export const ServiceSummaryCards: React.FC<ServiceSummaryCardsProps> = ({ kpis, services = [], isLoading }) => {
  const hasKpis = kpis && typeof kpis.totalServices === 'number' && (kpis.totalServices > 0 || services.length === 0);

  const total = hasKpis ? kpis.totalServices : services.length;
  const warranty = hasKpis
    ? kpis.warrantyServices
    : services.filter((s) => s.serviceClassification === 'WARRANTY').length;
  const general = hasKpis
    ? kpis.generalServices
    : services.filter((s) => s.serviceClassification === 'GENERAL').length;
  const completed = hasKpis
    ? kpis.completedServices
    : services.filter((s) => s.status === 'COMPLETED').length;
  const upcoming = hasKpis
    ? kpis.upcomingServices
    : services.filter((s) => s.status === 'SCHEDULED' || s.status === 'ASSIGNED' || s.status === 'IN_PROGRESS').length;
  const dueToday = kpis?.dueToday ?? 0;
  const overdue = kpis?.overdueServices ?? 0;

  const urgentTotal = dueToday + overdue;

  const getSparklineData = (
    count: number,
    items: ServiceItem[],
    predicate?: (s: ServiceItem) => boolean
  ): number[] => {
    if (count <= 0) {
      return [0, 0, 0, 0];
    }
    const matching = predicate ? items.filter(predicate) : items;
    if (matching.length === 0) {
      return [0, 0, 0, count];
    }

    const sorted = [...matching].sort(
      (a, b) =>
        new Date(a.scheduledDate || a.createdAt || 0).getTime() -
        new Date(b.scheduledDate || b.createdAt || 0).getTime()
    );
    const minTime = new Date(sorted[0]?.scheduledDate || sorted[0]?.createdAt || 0).getTime();
    const maxTime = new Date(
      sorted[sorted.length - 1]?.scheduledDate || sorted[sorted.length - 1]?.createdAt || 0
    ).getTime();

    if (maxTime > minTime) {
      const step = (maxTime - minTime) / 4;
      const bins = [0, 0, 0, 0];
      sorted.forEach((item) => {
        const t = new Date(item.scheduledDate || item.createdAt || 0).getTime();
        const bIdx = Math.min(3, Math.floor((t - minTime) / (step || 1)));
        bins[bIdx] = (bins[bIdx] || 0) + 1;
      });
      let acc = 0;
      return bins.map((b) => (acc += b));
    }

    return [Math.round(count * 0.25), Math.round(count * 0.5), Math.round(count * 0.75), count];
  };

  const cards = [
    {
      id: 'total-services',
      title: 'TOTAL SERVICES',
      metric: isLoading ? '...' : total.toLocaleString('en-IN'),
      supporting: `${kpis?.upcomingServices ?? 0} upcoming / scheduled`,
      supportingClass: 'text-slate-500 font-medium',
      icon: <Wrench className="w-5 h-5 text-white" />,
      iconBg: 'bg-sky-600',
      curveColor: 'blue' as const,
      dataPoints: getSparklineData(total, services),
    },
    {
      id: 'warranty-services',
      title: 'WARRANTY SERVICES',
      metric: isLoading ? '...' : warranty.toLocaleString('en-IN'),
      supporting: total > 0 ? `${Math.round((warranty / total) * 100)}% of scheduled` : 'Free under warranty',
      supportingClass: 'text-teal-700 font-semibold',
      icon: <ShieldCheck className="w-5 h-5 text-white" />,
      iconBg: 'bg-teal-600',
      curveColor: 'purple' as const,
      dataPoints: getSparklineData(warranty, services, (s) => s.serviceClassification === 'WARRANTY'),
    },
    {
      id: 'general-services',
      title: 'GENERAL SERVICES',
      metric: isLoading ? '...' : general.toLocaleString('en-IN'),
      supporting: 'Billable / Out of warranty',
      supportingClass: 'text-emerald-700 font-semibold',
      icon: <RefreshCw className="w-5 h-5 text-white" />,
      iconBg: 'bg-emerald-600',
      curveColor: 'green' as const,
      dataPoints: getSparklineData(general, services, (s) => s.serviceClassification === 'GENERAL'),
    },
    {
      id: 'actionable-services',
      title: 'ACTIONABLE / DUE',
      metric: isLoading ? '...' : urgentTotal.toLocaleString('en-IN'),
      supporting: overdue > 0 ? `${overdue} overdue • ${dueToday} due today` : `${dueToday} due today`,
      supportingClass: overdue > 0 ? 'text-red-700 font-bold' : 'text-amber-800 font-semibold',
      icon: <AlertTriangle className="w-5 h-5 text-white" />,
      iconBg: overdue > 0 ? 'bg-red-600' : 'bg-amber-600',
      curveColor: overdue > 0 ? ('red' as const) : ('orange' as const),
      dataPoints: getSparklineData(
        urgentTotal,
        services,
        (s) => s.status === 'OVERDUE' || (kpis?.dueToday ? s.status === 'SCHEDULED' : false)
      ),
    },
    {
      id: 'completed-services',
      title: 'COMPLETED VISITS',
      metric: isLoading ? '...' : completed.toLocaleString('en-IN'),
      supporting: 'Resolved & closed job cards',
      supportingClass: 'text-teal-700 font-semibold',
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      iconBg: 'bg-teal-700',
      curveColor: 'green' as const,
      dataPoints: getSparklineData(completed, services, (s) => s.status === 'COMPLETED'),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 select-none">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 pb-0 shadow-2xs hover:shadow-elevated hover:border-slate-300 transition-all duration-150 flex flex-col justify-between group overflow-hidden cursor-pointer last:col-span-2 sm:last:col-span-1"
        >
          {/* Card Top */}
          <div className="flex items-start gap-2.5 sm:gap-3.5 mb-1">
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${card.iconBg} shadow-2xs transition-colors shrink-0 mt-0.5`}
            >
              {card.icon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[9px] sm:text-[10px] font-bold text-slate-500 tracking-wider uppercase leading-tight truncate font-mono">
                {card.title}
              </h3>
              <span className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight block leading-tight mt-0.5">
                {card.metric}
              </span>
              <span className={`text-[10px] sm:text-[11px] block mt-0.5 leading-none font-mono truncate ${card.supportingClass}`}>
                {card.supporting}
              </span>
            </div>
          </div>

          {/* Card Bottom Sparkline */}
          <div className="mt-auto -mx-4">
            <ActivityCurve color={card.curveColor} data={card.dataPoints} />
          </div>
        </div>
      ))}
    </div>
  );
};
