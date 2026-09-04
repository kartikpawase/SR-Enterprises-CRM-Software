import React from 'react';
import { Users, UserCheck, UserPlus, ShieldCheck, Calendar } from 'lucide-react';
import { ActivityCurve } from '../../dashboard/components/ActivityCurve';

export interface CustomerSummaryCardsProps {
  totalCustomers?: number;
  activeCustomers?: number;
  newThisMonth?: number;
  withWarranty?: number;
  dueForService?: number;
}

export const CustomerSummaryCards: React.FC<CustomerSummaryCardsProps> = ({
  totalCustomers = 0,
  activeCustomers = 0,
  newThisMonth = 0,
  withWarranty = 0,
  dueForService = 0,
}) => {
  const cards = [
    {
      id: 'total-customers',
      title: 'TOTAL CUSTOMERS',
      metric: totalCustomers.toLocaleString('en-IN'),
      supporting: 'All time active & past',
      supportingClass: 'text-slate-500 font-medium',
      icon: <Users className="w-5 h-5 text-white" />,
      iconBg: 'bg-sky-600',
      curveColor: 'blue' as const,
      dataPoints: [580, 595, 608, 615, 622, 628, totalCustomers],
    },
    {
      id: 'active-customers',
      title: 'ACTIVE CUSTOMERS',
      metric: activeCustomers.toLocaleString('en-IN'),
      supporting: '81% of total',
      supportingClass: 'text-emerald-700 font-semibold',
      icon: <UserCheck className="w-5 h-5 text-white" />,
      iconBg: 'bg-emerald-600',
      curveColor: 'green' as const,
      dataPoints: [480, 490, 498, 502, 506, 510, activeCustomers],
    },
    {
      id: 'new-this-month',
      title: 'NEW THIS MONTH',
      metric: newThisMonth.toString(),
      supporting: '+12% from last month',
      supportingClass: 'text-teal-700 font-semibold',
      icon: <UserPlus className="w-5 h-5 text-white" />,
      iconBg: 'bg-teal-600',
      curveColor: 'purple' as const,
      dataPoints: [18, 22, 20, 24, 26, 25, newThisMonth],
    },
    {
      id: 'active-warranty',
      title: 'WITH ACTIVE WARRANTY',
      metric: withWarranty.toLocaleString('en-IN'),
      supporting: '34% of total base',
      supportingClass: 'text-slate-600 font-medium',
      icon: <ShieldCheck className="w-5 h-5 text-white" />,
      iconBg: 'bg-amber-600',
      curveColor: 'orange' as const,
      dataPoints: [205, 210, 208, 214, 212, 216, withWarranty],
    },
    {
      id: 'due-for-service',
      title: 'DUE FOR SERVICE',
      metric: dueForService.toLocaleString('en-IN'),
      supporting: 'Urgent attention required',
      supportingClass: 'text-red-700 font-semibold',
      icon: <Calendar className="w-5 h-5 text-white" />,
      iconBg: 'bg-red-600',
      curveColor: 'red' as const,
      dataPoints: [80, 85, 92, 88, 90, 94, dueForService],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 select-none">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-white rounded-xl border border-slate-200/90 p-4 pb-0 shadow-2xs hover:shadow-elevated hover:border-slate-300 transition-all duration-150 flex flex-col justify-between group overflow-hidden cursor-pointer"
        >
          {/* Card Top: Colored Round Icon + Title + Large Metric + Supporting */}
          <div className="flex items-start gap-3.5 mb-1">
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${card.iconBg} shadow-2xs transition-colors shrink-0 mt-0.5`}
            >
              {card.icon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[10px] font-bold text-slate-500 tracking-wider uppercase leading-tight truncate font-mono">
                {card.title}
              </h3>
              <span className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight block leading-tight mt-0.5">
                {card.metric}
              </span>
              <span className={`text-[11px] block mt-0.5 leading-none font-mono ${card.supportingClass}`}>
                {card.supporting}
              </span>
            </div>
          </div>

          {/* Card Bottom: Smooth Decorative Activity Sparkline Curve */}
          <div className="mt-auto -mx-4">
            <ActivityCurve color={card.curveColor} data={card.dataPoints} />
          </div>
        </div>
      ))}
    </div>
  );
};
