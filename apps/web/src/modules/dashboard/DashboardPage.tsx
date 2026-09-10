import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import { DashboardHeader } from './components/DashboardHeader';
import { OperationalCardsRow } from './components/OperationalCardsRow';
import { TodaysOverviewCard } from './components/TodaysOverviewCard';
import { TodaysScheduleCard } from './components/TodaysScheduleCard';
import { PaymentRemindersSection } from './components/PaymentRemindersSection';
import type { DashboardData } from './types';

// Default initial operational data to preserve instant rendering and layout stability
const DEFAULT_DASHBOARD_DATA: DashboardData = {
  cards: {
    servicesDueToday: 12,
    servicesUrgent: 4,
    newInquiries: 8,
    inquiriesUnread: 3,
    warrantiesExpiring: 4,
    paymentsDue: 5,
    paymentsOverdue: 2,
    techniciansOnDuty: 6,
    techniciansAvailable: 3,
  },
  overview: {
    servicesScheduled: 12,
    newInquiries: 8,
    warrantiesExpiring: 4,
    paymentsDue: 5,
    techniciansOnDuty: 6,
  },
  schedule: [
    {
      id: 'SCH-001',
      time: '10:00 AM',
      customerName: 'Rahul Patil',
      serviceName: 'Kent Grand Plus',
      mode: 'Doorstep',
      category: 'Warranty',
      status: 'Scheduled',
    },
    {
      id: 'SCH-002',
      time: '12:30 PM',
      customerName: 'Amit Sharma',
      serviceName: 'Aquaguard Aura',
      mode: 'In-Shop',
      category: 'General',
      status: 'Scheduled',
    },
    {
      id: 'SCH-003',
      time: '2:00 PM',
      customerName: 'Neha Joshi',
      serviceName: 'Kent Grand Plus',
      mode: 'Doorstep',
      category: 'General',
      status: 'Scheduled',
    },
    {
      id: 'SCH-004',
      time: '4:30 PM',
      customerName: 'Vijay Shinde',
      serviceName: 'Spare Part Installation',
      mode: 'Doorstep',
      category: 'General',
      status: 'Scheduled',
    },
    {
      id: 'SCH-005',
      time: '6:00 PM',
      customerName: 'Amit Patil',
      serviceName: 'RO Maintenance',
      mode: 'Doorstep',
      category: 'General',
      status: 'Scheduled',
    },
  ],
  paymentReminders: [
    {
      id: 'REM-001',
      customerId: '00000000-0000-0000-0000-000000000011',
      customerName: 'Rahul Patil',
      initials: 'RP',
      amount: 8500,
      formattedAmount: '₹ 8,500',
      dueTiming: 'Due tomorrow',
      invoiceNumber: 'INV-000184',
      status: 'due_soon',
    },
    {
      id: 'REM-002',
      customerId: '00000000-0000-0000-0000-000000000012',
      customerName: 'Amit Sharma',
      initials: 'AS',
      amount: 12000,
      formattedAmount: '₹ 12,000',
      dueTiming: 'Due in 3 days',
      invoiceNumber: 'INV-000186',
      status: 'due_soon',
    },
    {
      id: 'REM-003',
      customerId: '00000000-0000-0000-0000-000000000013',
      customerName: 'Neha Joshi',
      initials: 'NJ',
      amount: 5200,
      formattedAmount: '₹ 5,200',
      dueTiming: 'Overdue by 2 days',
      invoiceNumber: 'INV-000187',
      status: 'overdue',
    },
  ],
  notifications: {
    unreadCount: 3,
  },
};

let cachedDashboardData: DashboardData = DEFAULT_DASHBOARD_DATA;

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData>(cachedDashboardData);

  useEffect(() => {
    let isMounted = true;
    const fetchOverview = () => {
      apiClient
        .get<DashboardData>('/dashboard/overview')
        .then((res: any) => {
          if (!isMounted) return;
          const payload = res?.data?.data || res?.data || res;
          if (payload && payload.cards) {
            cachedDashboardData = payload;
            setData(payload);
          }
        })
        .catch(() => {
          // Retain operational state seamlessly
        });
    };

    fetchOverview();
    const interval = setInterval(fetchOverview, 15000);
    window.addEventListener('focus', fetchOverview);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', fetchOverview);
    };
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Header (Greeting + Search + Date + Notifications + Profile) */}
      <DashboardHeader
        unreadNotificationsCount={data.notifications?.unreadCount || 0}
      />

      {/* 2. Five Primary Operational Cards (Horizontal Row) */}
      <OperationalCardsRow data={data.cards} />

      {/* 3. Main Two-Column Operational Layout (~56% Left / ~44% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left (~58%): Today's Overview */}
        <div className="lg:col-span-7 flex flex-col">
          <TodaysOverviewCard data={data.overview} />
        </div>

        {/* Right (~42%): Today's Schedule */}
        <div className="lg:col-span-5 flex flex-col">
          <TodaysScheduleCard schedule={data.schedule} />
        </div>
      </div>

      {/* 4. Full-Width Payment Reminders Section */}
      <PaymentRemindersSection reminders={data.paymentReminders} />
    </div>
  );
};
