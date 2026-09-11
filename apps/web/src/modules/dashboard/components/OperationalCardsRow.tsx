import React from 'react';
import { Calendar, Mail, ShieldCheck, Wallet, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityCurve } from './ActivityCurve';
import type { OperationalCardsData } from '../types';

export interface OperationalCardsRowProps {
  data: OperationalCardsData;
}

export const OperationalCardsRow: React.FC<OperationalCardsRowProps> = ({ data }) => {
  const navigate = useNavigate();

  const getPoints = (history?: number[], count = 0) => {
    if (history && history.length > 0) return history;
    if (count > 0) {
      return [
        Math.round(count * 0.8),
        Math.round(count * 0.9),
        Math.round(count * 0.7),
        Math.round(count * 1.1),
        Math.round(count * 0.95),
        count,
        count,
      ];
    }
    return [0, 0, 0, 0, 0, 0, 0];
  };

  const cards = [
    {
      id: 'services-due',
      title: 'SERVICES DUE TODAY',
      count: data.servicesDueToday,
      statusLabel: `${data.servicesUrgent} urgent`,
      statusColor: 'text-red-700 font-bold',
      icon: <Calendar className="w-5 h-5 text-white" />,
      iconBg: 'bg-red-600',
      curveColor: 'red' as const,
      dataPoints: getPoints(data.history?.servicesDue, data.servicesDueToday),
      route: '/services',
    },
    {
      id: 'new-inquiries',
      title: 'NEW INQUIRIES',
      count: data.newInquiries,
      statusLabel: `${data.inquiriesUnread} unread`,
      statusColor: 'text-sky-700 font-bold',
      icon: <Mail className="w-5 h-5 text-white" />,
      iconBg: 'bg-sky-600',
      curveColor: 'blue' as const,
      dataPoints: getPoints(data.history?.newInquiries, data.newInquiries),
      route: '/inquiries',
    },
    {
      id: 'warranties-expiring',
      title: 'WARRANTIES EXPIRING',
      count: data.warrantiesExpiring,
      statusLabel: 'Within threshold',
      statusColor: 'text-slate-600 font-semibold',
      icon: <ShieldCheck className="w-5 h-5 text-white" />,
      iconBg: 'bg-amber-600',
      curveColor: 'orange' as const,
      dataPoints: getPoints(data.history?.warrantiesExpiring, data.warrantiesExpiring),
      route: '/warranty',
    },
    {
      id: 'payments-due',
      title: 'PAYMENTS DUE',
      count: data.paymentsDue,
      statusLabel: `${data.paymentsOverdue} overdue`,
      statusColor: 'text-red-700 font-bold',
      icon: <Wallet className="w-5 h-5 text-white" />,
      iconBg: 'bg-emerald-600',
      curveColor: 'green' as const,
      dataPoints: getPoints(data.history?.paymentsDue, data.paymentsDue),
      route: '/payments',
    },
    {
      id: 'technicians-duty',
      title: 'TECHNICIANS ON DUTY',
      count: data.techniciansOnDuty,
      statusLabel: `Available: ${data.techniciansAvailable}`,
      statusColor: 'text-emerald-700 font-bold',
      icon: <User className="w-5 h-5 text-white" />,
      iconBg: 'bg-teal-600',
      curveColor: 'purple' as const,
      dataPoints: getPoints(data.history?.techniciansOnDuty, data.techniciansOnDuty),
      route: '/technicians',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 select-none">
      {cards.map((card) => (
        <div
          key={card.id}
          onClick={() => navigate(card.route)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(card.route)}
          className="bg-white rounded-xl border border-slate-200/90 p-4 pb-0 shadow-2xs hover:shadow-elevated hover:border-slate-300 transition-all duration-150 cursor-pointer flex flex-col justify-between group overflow-hidden"
        >
          {/* Card Top: Circular Solid Icon on Left + Info on Right */}
          <div className="flex items-start gap-3.5 mb-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg} shadow-2xs transition-transform duration-150 shrink-0 mt-0.5`}
            >
              {card.icon}
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 tracking-wider uppercase leading-tight font-mono">
                {card.title}
              </h3>
              <span className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight block leading-tight mt-0.5">
                {card.count}
              </span>
              <span className={`text-[11px] block mt-0.5 leading-none font-mono ${card.statusColor}`}>
                {card.statusLabel}
              </span>
            </div>
          </div>

          {/* Card Bottom: Dynamic Responsive Activity Curve Line */}
          <div className="mt-auto -mx-4">
            <ActivityCurve color={card.curveColor} data={card.dataPoints} />
          </div>
        </div>
      ))}
    </div>
  );
};
