import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import type { ReminderKPIs } from '../reminders.api';
import {
  Bell,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface ReminderSummaryCardsProps {
  kpis?: ReminderKPIs;
  isLoading?: boolean;
}

export const ReminderSummaryCards: React.FC<ReminderSummaryCardsProps> = ({ kpis, isLoading }) => {
  const cards = [
    {
      title: 'Total Follow-ups',
      value: kpis?.totalReminders?.toString() || '0',
      subtitle: 'All recorded customer reminders',
      icon: Bell,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
    },
    {
      title: 'Pending Reminders',
      value: kpis?.pendingCount?.toString() || '0',
      subtitle: 'Awaiting customer follow-up',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
    {
      title: 'Due Today',
      value: kpis?.dueTodayCount?.toString() || '0',
      subtitle: 'Action items scheduled today',
      icon: AlertTriangle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      title: 'Overdue / Missed',
      value: kpis?.overdueCount?.toString() || '0',
      subtitle: 'Past scheduled follow-up date',
      icon: AlertTriangle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className={`border ${card.borderColor} shadow-subtle hover:shadow-card transition-shadow`}>
            <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">{card.title}</p>
                {isLoading ? (
                  <div className="h-6 sm:h-7 w-16 sm:w-20 bg-slate-100 animate-pulse rounded" />
                ) : (
                  <p className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">{card.value}</p>
                )}
                <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">{card.subtitle}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-xl ${card.bgColor} ${card.color} shrink-0`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
