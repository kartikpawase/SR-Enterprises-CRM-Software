import React, { useState, useEffect } from 'react';
import { Percent, Save, RotateCcw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCategorySettingsQuery, useUpdateSettingsMutation, useResetSettingsMutation } from '../settings.api';
import type { TaxSettings } from '@crm/types';
import { useToast } from '../../../providers/ToastProvider';

export const TaxSettingsSection: React.FC = () => {
  const toast = useToast();
  const { data, isLoading, error } = useCategorySettingsQuery<TaxSettings>('TAX');
  const updateMutation = useUpdateSettingsMutation<TaxSettings>();
  const resetMutation = useResetSettingsMutation();

  const [form, setForm] = useState<TaxSettings>({
    taxEnabled: true,
    defaultTaxRatePercent: 18.0,
    taxInclusivePricing: false,
    taxNumber: '27AAAAA0000A1Z5',
    defaultHsnSac: '84212190',
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.value) {
      setForm(data.value);
      setIsDirty(false);
    }
  }, [data]);

  const handleChange = (field: keyof TaxSettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        category: 'TAX',
        data: {
          ...form,
          defaultTaxRatePercent: parseFloat(String(form.defaultTaxRatePercent)) || 0,
        },
        expectedVersion: data?.version,
      });
      setIsDirty(false);
      toast.success('Tax & GST structure saved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update tax settings.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore standard tax structure to system defaults?')) return;
    try {
      await resetMutation.mutateAsync({ category: 'TAX' });
      toast.success('Tax structure restored to defaults.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset tax settings.');
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
        <p className="text-sm">Failed to load tax configuration: {(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-2xs">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Tax &amp; GST Configuration</h2>
            <p className="text-xs text-slate-500">Goods and Services Tax parameters, default tariff codes, and pricing inclusivity.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Immutable Snapshot Safe
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
              Standard GST Rate (%) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              value={form.defaultTaxRatePercent}
              onChange={(e) => handleChange('defaultTaxRatePercent', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">Default GST rate applied to RO machines and spare parts.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Default HSN / SAC Code
            </label>
            <input
              type="text"
              value={form.defaultHsnSac || ''}
              onChange={(e) => handleChange('defaultHsnSac', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
              placeholder="84212190"
            />
            <p className="text-[11px] text-slate-500 mt-1">Water purification machinery tariff classification code.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Tax Registration Number
            </label>
            <input
              type="text"
              value={form.taxNumber || ''}
              onChange={(e) => handleChange('taxNumber', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
              placeholder="27AAAAA0000A1Z5"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.taxEnabled}
              onChange={(e) => handleChange('taxEnabled', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Enable GST Calculation Engine</span>
              <p className="text-[11px] text-slate-500">Automatically compute CGST and SGST on billing.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.taxInclusivePricing}
              onChange={(e) => handleChange('taxInclusivePricing', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Tax Inclusive Pricing</span>
              <p className="text-[11px] text-slate-500">Product unit prices entered already include applicable taxes.</p>
            </div>
          </label>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Critical Accounting Preservation:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Historical Invoices: Changing standard GST rate NEVER recalculates previously issued invoices.</li>
              <li>New Invoices: Uses this default rate unless explicitly overridden on line items.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          Version: {data?.version ?? 1} • Source: PostgreSQL app_settings
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
