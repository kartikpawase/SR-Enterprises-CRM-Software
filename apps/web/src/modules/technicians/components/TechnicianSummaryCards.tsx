import React from 'react';
import { Users, UserCheck, UserMinus, ShieldAlert } from 'lucide-react';
import type { TechnicianKPIs } from '../technicians.api';

export interface TechnicianSummaryCardsProps {
  kpis?: TechnicianKPIs;
  isLoading?: boolean;
  activeFilter?: string;
  onFilterSelect?: (status: string) => void;
}

export const TechnicianSummaryCards: React.FC<TechnicianSummaryCardsProps> = ({
  kpis,
  isLoading,
  activeFilter,
  onFilterSelect,
}) => {
  const cards = [
    {
      id: 'ALL',
      title: 'Total Workforce',
      count: kpis?.totalTechnicians ?? 0,
      icon: <Users className="w-5 h-5" />,
      colorScheme: {
        bg: 'bg-white hover:bg-slate-50',
        activeBg: 'bg-sky-50/80 border-sky-500 ring-2 ring-sky-400/50',
        border: 'border-slate-200/90',
        iconBg: 'bg-sky-600 text-white',
        text: 'text-slate-900',
        badge: 'bg-sky-100 text-sky-800 font-mono',
      },
      subtitle: 'Registered field service crew',
      badgeText: 'Total Team',
    },
    {
      id: 'ACTIVE',
      title: 'Active & Available',
      count: kpis?.activeTechnicians ?? 0,
      icon: <UserCheck className="w-5 h-5" />,
      colorScheme: {
        bg: 'bg-white hover:bg-slate-50',
        activeBg: 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400/50',
        border: 'border-slate-200/90',
        iconBg: 'bg-emerald-600 text-white',
        text: 'text-emerald-950',
        badge: 'bg-emerald-100 text-emerald-800 font-mono',
      },
      subtitle: 'Ready for dispatch & orders',
      badgeText: 'Ready',
    },
    {
      id: 'ON_LEAVE',
      title: 'On Leave',
      count: kpis?.onLeave ?? 0,
      icon: <UserMinus className="w-5 h-5" />,
      colorScheme: {
        bg: 'bg-white hover:bg-slate-50',
        activeBg: 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/50',
        border: 'border-slate-200/90',
        iconBg: 'bg-amber-600 text-white',
        text: 'text-amber-950',
        badge: 'bg-amber-100 text-amber-800 font-mono',
      },
      subtitle: 'Temporarily away from field',
      badgeText: 'Away',
    },
    {
      id: 'INACTIVE',
      title: 'Inactive / Suspended',
      count: kpis?.inactiveTechnicians ?? 0,
      icon: <ShieldAlert className="w-5 h-5" />,
      colorScheme: {
        bg: 'bg-white hover:bg-slate-50',
        activeBg: 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-400/50',
        border: 'border-slate-200/90',
        iconBg: 'bg-rose-600 text-white',
        text: 'text-rose-950',
        badge: 'bg-rose-100 text-rose-800 font-mono',
      },
      subtitle: 'Off-boarded or disabled',
      badgeText: 'Inactive',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 select-none">
      {cards.map((card) => {
        const isSelected = activeFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onFilterSelect?.(card.id)}
            className={`relative overflow-hidden text-left rounded-xl border p-3 sm:p-5 transition-all duration-150 shadow-2xs hover:shadow-elevated cursor-pointer ${
              isSelected ? card.colorScheme.activeBg : `${card.colorScheme.bg} ${card.colorScheme.border}`
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <span className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-500 block tracking-wider uppercase font-mono truncate">
                  {card.title}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl sm:text-2xl lg:text-3xl font-display font-extrabold tracking-tight ${card.colorScheme.text}`}>
                    {isLoading ? (
                      <span className="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse" />
                    ) : (
                      card.count
                    )}
                  </span>
                </div>
              </div>

              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-2xs shrink-0 ${card.colorScheme.iconBg}`}>
                {card.icon}
              </div>
            </div>

            <div className="mt-3 sm:mt-4 flex items-center justify-between pt-2.5 sm:pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium truncate max-w-[75px] sm:max-w-[130px] text-[10px] sm:text-xs">{card.subtitle}</span>
              <span className={`text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full truncate ${card.colorScheme.badge}`}>
                {card.badgeText}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
