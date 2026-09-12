import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { formatINR } from '../../../lib/formatters';
import type { PaymentKPIs } from '../payments.api';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface PaymentSummaryCardsProps {
  kpis?: PaymentKPIs;
  isLoading?: boolean;
}

export const PaymentSummaryCards: React.FC<PaymentSummaryCardsProps> = ({ kpis, isLoading }) => {
  const cards = [
    {
      title: 'Total Collections',
      value: kpis ? formatINR(kpis.totalCollected) : '₹0.00',
      subtitle: `${kpis?.completedPaymentsCount || 0} completed payments`,
      icon: CreditCard,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
    {
      title: "Today's Collection",
      value: kpis ? formatINR(kpis.todayCollected) : '₹0.00',
      subtitle: 'Realized collections today',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      title: 'Outstanding Dues',
      value: kpis ? formatINR(kpis.totalOutstanding) : '₹0.00',
      subtitle: 'Total uncollected receivables',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
    {
      title: 'Overdue Invoices',
      value: kpis?.overdueInvoicesCount?.toString() || '0',
      subtitle: 'Invoices past payment due date',
      icon: AlertCircle,
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
                  <div className="h-6 sm:h-7 w-20 sm:w-28 bg-slate-100 animate-pulse rounded" />
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
