import React, { useState, useEffect } from 'react';
import { Globe, Save, RotateCcw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCategorySettingsQuery, useUpdateSettingsMutation, useResetSettingsMutation } from '../settings.api';
import type { SystemSettings } from '@crm/types';
import { useToast } from '../../../providers/ToastProvider';

export const LocalizationSettingsSection: React.FC = () => {
  const toast = useToast();
  const { data, isLoading, error } = useCategorySettingsQuery<SystemSettings>('SYSTEM');
  const updateMutation = useUpdateSettingsMutation<SystemSettings>();
  const resetMutation = useResetSettingsMutation();

  const [form, setForm] = useState<SystemSettings>({
    appName: 'SR Enterprises CRM / SRM',
    appVersion: '1.0.0',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    locale: 'en-IN',
    defaultPageSize: 25,
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.value) {
      setForm(data.value);
      setIsDirty(false);
    }
  }, [data]);

  const handleChange = (field: keyof SystemSettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        category: 'SYSTEM',
        data: {
          ...form,
          defaultPageSize: parseInt(String(form.defaultPageSize), 10) || 25,
        },
        expectedVersion: data?.version,
      });
      setIsDirty(false);
      toast.success('Localization & system parameters updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update system settings.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore system & localization parameters to defaults?')) return;
    try {
      await resetMutation.mutateAsync({ category: 'SYSTEM' });
      toast.success('System settings restored to defaults.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset settings.');
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
        <p className="text-sm">Failed to load localization settings: {(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-primary-600 shadow-2xs">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Localization &amp; System Parameters</h2>
            <p className="text-xs text-slate-500">Official timezones, currency conventions, date formatting, and default grid pagination.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Public Metadata Live
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Application Title *
            </label>
            <input
              type="text"
              required
              value={form.appName}
              onChange={(e) => handleChange('appName', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              System Timezone *
            </label>
            <select
              value={form.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900 cursor-pointer"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Currency Symbol &amp; Code *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={form.currencySymbol}
                onChange={(e) => handleChange('currencySymbol', e.target.value)}
                className="w-16 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-center text-slate-900 font-bold"
                placeholder="₹"
              />
              <input
                type="text"
                required
                value={form.currency}
                onChange={(e) => handleChange('currency', e.target.value.toUpperCase())}
                className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
                placeholder="INR"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Date Representation *
            </label>
            <select
              value={form.dateFormat}
              onChange={(e) => handleChange('dateFormat', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900 cursor-pointer"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Time Format *
            </label>
            <select
              value={form.timeFormat}
              onChange={(e) => handleChange('timeFormat', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900 cursor-pointer"
            >
              <option value="12h">12-Hour (e.g. 02:30 PM)</option>
              <option value="24h">24-Hour (e.g. 14:30)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Default Table Page Size *
            </label>
            <input
              type="number"
              min="5"
              max="200"
              required
              value={form.defaultPageSize}
              onChange={(e) => handleChange('defaultPageSize', parseInt(e.target.value, 10) || 25)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Public Access &amp; Performance:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Available via <code className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">/api/v1/settings/public</code> for fast initial branding resolution.</li>
              <li>Safe for non-authenticated customer invoice views.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          Version: {data?.version ?? 1} • Source: PostgreSQL app_settings (SYSTEM)
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
