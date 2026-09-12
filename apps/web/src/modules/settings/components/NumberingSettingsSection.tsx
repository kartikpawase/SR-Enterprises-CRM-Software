import React, { useState, useEffect } from 'react';
import { Hash, Save, RotateCcw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCategorySettingsQuery, useUpdateSettingsMutation, useResetSettingsMutation } from '../settings.api';
import type { NumberingSettings } from '@crm/types';
import { useToast } from '../../../providers/ToastProvider';

export const NumberingSettingsSection: React.FC = () => {
  const toast = useToast();
  const { data, isLoading, error } = useCategorySettingsQuery<NumberingSettings>('NUMBERING');
  const updateMutation = useUpdateSettingsMutation<NumberingSettings>();
  const resetMutation = useResetSettingsMutation();

  const [form, setForm] = useState<NumberingSettings>({
    customerPrefix: 'CX',
    invoicePrefix: 'INV',
    salePrefix: 'SALE',
    servicePrefix: 'SRV',
    jobCardPrefix: 'JC',
    paymentPrefix: 'PAY',
    warrantyPrefix: 'WAR',
    assetPrefix: 'ASSET',
    inquiryPrefix: 'INQ',
    reminderPrefix: 'REM',
    padding: 4,
    yearReset: true,
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.value) {
      setForm(data.value);
      setIsDirty(false);
    }
  }, [data]);

  const handleChange = (field: keyof NumberingSettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        category: 'NUMBERING',
        data: {
          ...form,
          padding: parseInt(String(form.padding), 10) || 4,
        },
        expectedVersion: data?.version,
      });
      setIsDirty(false);
      toast.success('Centralized numbering rules saved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update numbering settings.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore numbering rules to system defaults?')) return;
    try {
      await resetMutation.mutateAsync({ category: 'NUMBERING' });
      toast.success('Numbering rules restored to defaults.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset numbering settings.');
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
        <p className="text-sm">Failed to load numbering configuration: {(error as any)?.message}</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-primary-600 shadow-2xs">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Sequential Business Numbering</h2>
            <p className="text-xs text-slate-500">Atomic, concurrency-safe business document sequence prefixes and zero-padding format.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Collision-Proof Locks
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Customer Prefix *
            </label>
            <input
              type="text"
              required
              value={form.customerPrefix}
              onChange={(e) => handleChange('customerPrefix', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Sample: {form.customerPrefix}-{currentYear}-{'1'.padStart(form.padding, '0')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Sale Order Prefix *
            </label>
            <input
              type="text"
              required
              value={form.salePrefix}
              onChange={(e) => handleChange('salePrefix', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Sample: {form.salePrefix}-{currentYear}-{'1'.padStart(form.padding, '0')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Invoice Prefix *
            </label>
            <input
              type="text"
              required
              value={form.invoicePrefix}
              onChange={(e) => handleChange('invoicePrefix', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Sample: {form.invoicePrefix}-{currentYear}-{'1'.padStart(form.padding, '0')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Service Prefix *
            </label>
            <input
              type="text"
              required
              value={form.servicePrefix}
              onChange={(e) => handleChange('servicePrefix', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Sample: {form.servicePrefix}-{currentYear}-{'1'.padStart(form.padding, '0')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Job Card Prefix *
            </label>
            <input
              type="text"
              required
              value={form.jobCardPrefix}
              onChange={(e) => handleChange('jobCardPrefix', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Sample: {form.jobCardPrefix}-{currentYear}-{'1'.padStart(form.padding, '0')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Payment Receipt Prefix *
            </label>
            <input
              type="text"
              required
              value={form.paymentPrefix}
              onChange={(e) => handleChange('paymentPrefix', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Sample: {form.paymentPrefix}-{currentYear}-{'1'.padStart(form.padding, '0')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Counter Zero Padding (Digits) *
            </label>
            <input
              type="number"
              min="2"
              max="10"
              required
              value={form.padding}
              onChange={(e) => handleChange('padding', parseInt(e.target.value, 10) || 4)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.yearReset}
              onChange={(e) => handleChange('yearReset', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Annual Counter Reset on New Calendar Year</span>
              <p className="text-[11px] text-slate-500">Resets sequence counters to 0001 on January 1st of each calendar year.</p>
            </div>
          </label>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Transactional Safety Guarantee:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Atomic Increments: Database-level sequence table enforces zero collisions under heavy concurrent load.</li>
              <li>Immutability: Old customer, sale, and invoice numbers are NEVER modified retrospectively.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          Version: {data?.version ?? 1} • Source: PostgreSQL app_settings (NUMBERING)
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
