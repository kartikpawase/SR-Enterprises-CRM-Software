import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Save, RotateCcw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCategorySettingsQuery, useUpdateSettingsMutation, useResetSettingsMutation } from '../settings.api';
import type { NotificationSettings } from '@crm/types';
import { useToast } from '../../../providers/ToastProvider';

export const NotificationSettingsSection: React.FC = () => {
  const toast = useToast();
  const { data, isLoading, error } = useCategorySettingsQuery<NotificationSettings>('NOTIFICATION');
  const updateMutation = useUpdateSettingsMutation<NotificationSettings>();
  const resetMutation = useResetSettingsMutation();

  const [form, setForm] = useState<NotificationSettings>({
    warrantyExpiryReminderDays: [30, 15, 7],
    invoiceDueReminderDays: [7, 3, 1],
    serviceReminderDays: [14, 7],
    inAppEnabled: true,
    emailEnabled: true,
    whatsappEnabled: true,
  });

  const [invoiceDaysStr, setInvoiceDaysStr] = useState('7, 3, 1');
  const [serviceDaysStr, setServiceDaysStr] = useState('14, 7');
  const [warrantyDaysStr, setWarrantyDaysStr] = useState('30, 15, 7');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.value) {
      setForm(data.value);
      setInvoiceDaysStr(data.value.invoiceDueReminderDays?.join(', ') || '7, 3, 1');
      setServiceDaysStr(data.value.serviceReminderDays?.join(', ') || '14, 7');
      setWarrantyDaysStr(data.value.warrantyExpiryReminderDays?.join(', ') || '30, 15, 7');
      setIsDirty(false);
    }
  }, [data]);

  const parseDays = (str: string): number[] => {
    return str
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0 && n <= 365);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const invoiceDays = parseDays(invoiceDaysStr);
    const serviceDays = parseDays(serviceDaysStr);
    const warrantyDays = parseDays(warrantyDaysStr);

    try {
      await updateMutation.mutateAsync({
        category: 'NOTIFICATION',
        data: {
          ...form,
          invoiceDueReminderDays: invoiceDays.length > 0 ? invoiceDays : [7, 3, 1],
          serviceReminderDays: serviceDays.length > 0 ? serviceDays : [14, 7],
          warrantyExpiryReminderDays: warrantyDays.length > 0 ? warrantyDays : [30, 15, 7],
        },
        expectedVersion: data?.version,
      });
      setIsDirty(false);
      toast.success('Notification preferences saved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update notification settings.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore notification triggers to system defaults?')) return;
    try {
      await resetMutation.mutateAsync({ category: 'NOTIFICATION' });
      toast.success('Notification settings restored to defaults.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset notification settings.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-20 bg-slate-100 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-xl border border-red-200 text-red-700 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">Failed to load notification settings: {(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-primary-600 shadow-2xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Automated Dispatch &amp; Reminders</h2>
            <p className="text-xs text-slate-500">Multi-channel communication toggles and automated scheduled advance reminder cadences.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Engine Guard Active
          </span>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Channel Activation Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.inAppEnabled}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, inAppEnabled: e.target.checked }));
                setIsDirty(true);
              }}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-slate-500" /> In-App Notification Center
              </span>
              <p className="text-[11px] text-slate-500">Alert bell inside CRM header.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.emailEnabled}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, emailEnabled: e.target.checked }));
                setIsDirty(true);
              }}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Dispatch (PHPMailer)
              </span>
              <p className="text-[11px] text-slate-500">Automated transactional emails.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.whatsappEnabled}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, whatsappEnabled: e.target.checked }));
                setIsDirty(true);
              }}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" /> WhatsApp Direct Alerts
              </span>
              <p className="text-[11px] text-slate-500">Customer WhatsApp links &amp; templates.</p>
            </div>
          </label>
        </div>

        {/* Cadence Days Intervals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Invoice Due Reminder (Days) *
            </label>
            <input
              type="text"
              required
              value={invoiceDaysStr}
              onChange={(e) => {
                setInvoiceDaysStr(e.target.value);
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
              placeholder="e.g. 7, 3, 1"
            />
            <p className="text-[11px] text-slate-500 mt-1">Days before invoice settlement due date.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Service Visit Reminder (Days) *
            </label>
            <input
              type="text"
              required
              value={serviceDaysStr}
              onChange={(e) => {
                setServiceDaysStr(e.target.value);
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
              placeholder="e.g. 14, 7"
            />
            <p className="text-[11px] text-slate-500 mt-1">Advance notice before periodic RO service.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Warranty Expiry Notice (Days) *
            </label>
            <input
              type="text"
              required
              value={warrantyDaysStr}
              onChange={(e) => {
                setWarrantyDaysStr(e.target.value);
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
              placeholder="e.g. 30, 15, 7"
            />
            <p className="text-[11px] text-slate-500 mt-1">Alerts for machine warranty / AMC renewal.</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Backend Enforcement:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>If a channel toggle is turned OFF, background workers strictly skip dispatches for that channel.</li>
              <li>Days intervals are read directly by the automated scheduler to trigger advance notifications.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          Version: {data?.version ?? 1} • Source: PostgreSQL app_settings (NOTIFICATION)
        </span>
        <button
          type="submit"
          disabled={!isDirty || updateMutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>
    </form>
  );
};
