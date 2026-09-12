import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import { DashboardHeader } from './components/DashboardHeader';
import { OperationalCardsRow } from './components/OperationalCardsRow';
import { TodaysOverviewCard } from './components/TodaysOverviewCard';
import { TodaysScheduleCard } from './components/TodaysScheduleCard';
import { PaymentRemindersSection } from './components/PaymentRemindersSection';
import {
  getStoredDashboardPreferences,
  type DashboardWidgetPreferences,
} from '../settings/components/DashboardSettingsSection';
import type { DashboardData } from './types';

// Clean initial operational state with strictly no seeded dummy data
const DEFAULT_DASHBOARD_DATA: DashboardData = {
  cards: {
    servicesDueToday: 0,
    servicesUrgent: 0,
    newInquiries: 0,
    inquiriesUnread: 0,
    warrantiesExpiring: 0,
    paymentsDue: 0,
    paymentsOverdue: 0,
    techniciansOnDuty: 0,
    techniciansAvailable: 0,
  },
  overview: {
    servicesScheduled: 0,
    newInquiries: 0,
    warrantiesExpiring: 0,
    paymentsDue: 0,
    techniciansOnDuty: 0,
  },
  schedule: [],
  paymentReminders: [],
  notifications: {
    unreadCount: 0,
  },
};

let cachedDashboardData: DashboardData = DEFAULT_DASHBOARD_DATA;

export const resetDashboardCache = () => {
  cachedDashboardData = DEFAULT_DASHBOARD_DATA;
};

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData>(cachedDashboardData);
  const [prefs, setPrefs] = useState<DashboardWidgetPreferences>(getStoredDashboardPreferences);

  useEffect(() => {
    const handlePrefsUpdated = () => {
      setPrefs(getStoredDashboardPreferences());
    };
    window.addEventListener('crm_dashboard_preferences_updated', handlePrefsUpdated);
    return () => {
      window.removeEventListener('crm_dashboard_preferences_updated', handlePrefsUpdated);
    };
  }, []);

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

  const hasMiddleRow = prefs.showTodaysOverview || prefs.showTodaysSchedule;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Header (Greeting + Search + Date + Notifications + Profile) */}
      <DashboardHeader
        unreadNotificationsCount={data.notifications?.unreadCount || 0}
      />

      {/* 2. Five Primary Operational Cards (Horizontal Row) */}
      {prefs.showOperationalCards && <OperationalCardsRow data={data.cards} />}

      {/* 3. Main Two-Column Operational Layout (~56% Left / ~44% Right) */}
      {hasMiddleRow && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left (~58%): Today's Overview */}
          {prefs.showTodaysOverview && (
            <div className={prefs.showTodaysSchedule ? 'lg:col-span-7 flex flex-col' : 'lg:col-span-12 flex flex-col'}>
              <TodaysOverviewCard data={data.overview} />
            </div>
          )}

          {/* Right (~42%): Today's Schedule */}
          {prefs.showTodaysSchedule && (
            <div className={prefs.showTodaysOverview ? 'lg:col-span-5 flex flex-col' : 'lg:col-span-12 flex flex-col'}>
              <TodaysScheduleCard schedule={data.schedule} />
            </div>
          )}
        </div>
      )}

      {/* 4. Full-Width Payment Reminders Section */}
      {prefs.showPaymentReminders && <PaymentRemindersSection reminders={data.paymentReminders} />}
    </div>
  );
};
