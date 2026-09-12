import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Save, RotateCcw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../providers/ToastProvider';

export interface DashboardWidgetPreferences {
  showOperationalCards: boolean;
  showTodaysOverview: boolean;
  showTodaysSchedule: boolean;
  showPaymentReminders: boolean;
}

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardWidgetPreferences = {
  showOperationalCards: true,
  showTodaysOverview: true,
  showTodaysSchedule: true,
  showPaymentReminders: true,
};

export const getStoredDashboardPreferences = (): DashboardWidgetPreferences => {
  try {
    const raw = localStorage.getItem('crm_dashboard_preferences');
    if (raw) return { ...DEFAULT_DASHBOARD_PREFERENCES, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_DASHBOARD_PREFERENCES;
};

export const DashboardSettingsSection: React.FC = () => {
  const toast = useToast();
  const [prefs, setPrefs] = useState<DashboardWidgetPreferences>(getStoredDashboardPreferences);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setPrefs(getStoredDashboardPreferences());
    setIsDirty(false);
  }, []);

  const handleToggle = (key: keyof DashboardWidgetPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setIsDirty(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('crm_dashboard_preferences', JSON.stringify(prefs));
      window.dispatchEvent(new Event('crm_dashboard_preferences_updated'));
      setIsDirty(false);
      toast.success('Dashboard layout preferences saved and applied.');
    } catch {
      toast.error('Failed to persist dashboard preferences.');
    }
  };

  const handleReset = () => {
    setPrefs(DEFAULT_DASHBOARD_PREFERENCES);
    localStorage.setItem('crm_dashboard_preferences', JSON.stringify(DEFAULT_DASHBOARD_PREFERENCES));
    window.dispatchEvent(new Event('crm_dashboard_preferences_updated'));
    setIsDirty(false);
    toast.success('Dashboard widgets restored to full default display.');
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-primary-600 shadow-2xs">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Dashboard Widget Visibility</h2>
            <p className="text-xs text-slate-500">Configure which operational cards and activity widgets render on your dashboard.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Instant UI Sync
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Show All Widgets
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.showOperationalCards}
              onChange={() => handleToggle('showOperationalCards')}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Primary Operational Metric Cards</span>
              <p className="text-[11px] text-slate-500">Services due, urgent tickets, warranty expiries, and pending payments row.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.showTodaysOverview}
              onChange={() => handleToggle('showTodaysOverview')}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Today&apos;s Operations Overview</span>
              <p className="text-[11px] text-slate-500">Left-column daily performance snapshot and active technician count.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.showTodaysSchedule}
              onChange={() => handleToggle('showTodaysSchedule')}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Today&apos;s Doorstep Service Schedule</span>
              <p className="text-[11px] text-slate-500">Right-column chronological timetable of upcoming technician visits.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.showPaymentReminders}
              onChange={() => handleToggle('showPaymentReminders')}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Settlement &amp; Payment Reminders</span>
              <p className="text-[11px] text-slate-500">Bottom table of overdue and pending customer invoices.</p>
            </div>
          </label>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Guaranteed Compliance:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Disabled widgets completely unmount and stop rendering on the live dashboard.</li>
              <li>Data sources and underlying operational numbers are preserved with 100% mathematical integrity.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          Source: Client Enterprise Preferences
        </span>
        <button
          type="submit"
          disabled={!isDirty}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isDirty ? 'Apply Changes' : 'Saved'}
        </button>
      </div>
    </form>
  );
};
