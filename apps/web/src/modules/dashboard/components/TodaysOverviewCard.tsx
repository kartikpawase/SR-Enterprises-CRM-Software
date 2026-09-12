import React from 'react';
import { Calendar, ShieldCheck, Wallet, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { OverviewCountsData } from '../types';

export interface TodaysOverviewCardProps {
  data: OverviewCountsData;
}

export const TodaysOverviewCard: React.FC<TodaysOverviewCardProps> = ({ data }) => {
  const navigate = useNavigate();

  const rows = [
    {
      id: 'services-scheduled',
      title: 'Services Scheduled',
      description: 'Total services scheduled for today',
      count: data.servicesScheduled,
      countColor: 'text-red-600',
      icon: <Calendar className="w-5 h-5 text-red-600" />,
      iconBg: 'bg-red-50 border border-red-200/80',
      route: '/services',
    },
    {
      id: 'warranties-expiring',
      title: 'Warranties Expiring Soon',
      description: 'Warranties expiring within threshold',
      count: data.warrantiesExpiring,
      countColor: 'text-amber-600',
      icon: <ShieldCheck className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-50 border border-amber-200/80',
      route: '/warranty',
    },
    {
      id: 'payments-due',
      title: 'Payments Due',
      description: 'Payments due from customers',
      count: data.paymentsDue,
      countColor: 'text-red-600',
      icon: <Wallet className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50 border border-emerald-200/80',
      route: '/payments',
    },
    {
      id: 'technicians-duty',
      title: 'Technicians On Duty',
      description: 'Technicians available today',
      count: data.techniciansOnDuty,
      countColor: 'text-slate-900',
      icon: <User className="w-5 h-5 text-teal-600" />,
      iconBg: 'bg-teal-50 border border-teal-200/80',
      route: '/technicians',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs select-none flex flex-col justify-between h-full">
      {/* Header with Title and View All Action */}
      <div className="flex items-center justify-between pb-3.5 mb-2">
        <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 tracking-tight">
          Today's Overview
        </h2>
        <button
          type="button"
          onClick={() => navigate('/services')}
          className="text-xs font-bold text-primary-700 hover:text-primary-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer px-3 py-1 rounded-lg shadow-2xs"
        >
          View All
        </button>
      </div>

      {/* 5 Operational Rows */}
      <div className="space-y-2 flex-1 flex flex-col justify-around">
        {rows.map((row) => (
          <div
            key={row.id}
            onClick={() => navigate(row.route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(row.route)}
            className="py-2 flex items-center justify-between hover:bg-slate-50/80 rounded-xl px-2.5 -mx-2.5 transition-colors cursor-pointer group"
          >
            {/* Left: Colored Icon + Title & Description */}
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${row.iconBg} shrink-0 shadow-2xs transition-colors`}
              >
                {row.icon}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {row.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  {row.description}
                </p>
              </div>
            </div>

            {/* Right: Dynamic Count & Chevron */}
            <div className="flex items-center gap-3">
              <span className={`text-base sm:text-lg font-bold font-mono ${row.countColor}`}>
                {row.count}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
