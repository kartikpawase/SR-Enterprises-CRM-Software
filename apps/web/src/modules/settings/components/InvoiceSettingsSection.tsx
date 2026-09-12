import React, { useState, useEffect } from 'react';
import { FileText, Save, RotateCcw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCategorySettingsQuery, useUpdateSettingsMutation, useResetSettingsMutation } from '../settings.api';
import type { InvoiceSettings } from '@crm/types';
import { useToast } from '../../../providers/ToastProvider';

export const InvoiceSettingsSection: React.FC = () => {
  const toast = useToast();
  const { data, isLoading, error } = useCategorySettingsQuery<InvoiceSettings>('INVOICE');
  const updateMutation = useUpdateSettingsMutation<InvoiceSettings>();
  const resetMutation = useResetSettingsMutation();

  const [form, setForm] = useState<InvoiceSettings>({
    prefix: 'INV',
    numberFormat: 'INV-{YYYY}-{COUNTER}',
    startingNumber: 1,
    paymentTermsDays: 30,
    defaultNotes: '',
    defaultTermsAndConditions: '',
    showTaxBreakdown: true,
    showGst: true,
    footerText: '',
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.value) {
      setForm(data.value);
      setIsDirty(false);
    }
  }, [data]);

  const handleChange = (field: keyof InvoiceSettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        category: 'INVOICE',
        data: {
          ...form,
          paymentTermsDays: Number(form.paymentTermsDays),
          startingNumber: Number(form.startingNumber),
        },
        expectedVersion: data?.version,
      });
      setIsDirty(false);
      toast.success('Invoice parameters updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update invoice settings.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore invoice parameters to system defaults?')) return;
    try {
      await resetMutation.mutateAsync({ category: 'INVOICE' });
      toast.success('Invoice settings restored to defaults.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset invoice settings.');
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
        <p className="text-sm">Failed to load invoice settings: {(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-primary-600 shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Invoice Configuration</h2>
            <p className="text-xs text-slate-500">Numbering sequence rules, standard settlement terms, and legal disclosure text.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Live Consumer Active
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
              Invoice Prefix *
            </label>
            <input
              type="text"
              required
              value={form.prefix}
              onChange={(e) => handleChange('prefix', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
              placeholder="INV"
            />
            <p className="text-[11px] text-slate-500 mt-1">Uppercase letters and digits only (e.g. INV, SRE).</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Payment Terms (Days) *
            </label>
            <input
              type="number"
              min="0"
              max="365"
              required
              value={form.paymentTermsDays}
              onChange={(e) => handleChange('paymentTermsDays', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
            />
            <p className="text-[11px] text-slate-500 mt-1">Calculates due date for new invoices automatically.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Authorized Signatory Title
            </label>
            <input
              type="text"
              value={form.footerText || ''}
              onChange={(e) => handleChange('footerText', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900"
              placeholder="e.g. Authorized Signatory"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Default Customer Note
            </label>
            <input
              type="text"
              value={form.defaultNotes}
              onChange={(e) => handleChange('defaultNotes', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900"
              placeholder="e.g. Thank you for choosing SR Enterprises for your water purification needs."
            />
            <p className="text-[11px] text-slate-500 mt-1">Automatically pre-fills the notes field when creating new invoices.</p>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Default Terms &amp; Conditions *
            </label>
            <textarea
              rows={3}
              required
              value={form.defaultTermsAndConditions}
              onChange={(e) => handleChange('defaultTermsAndConditions', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900 resize-y"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showGst}
              onChange={(e) => handleChange('showGst', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Display GST Information on Invoices</span>
              <p className="text-[11px] text-slate-500">Shows company and customer GSTIN on printouts.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showTaxBreakdown}
              onChange={(e) => handleChange('showTaxBreakdown', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Show Tax Breakdown (CGST / SGST)</span>
              <p className="text-[11px] text-slate-500">Itemizes 9% CGST + 9% SGST split on taxable invoices.</p>
            </div>
          </label>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Guaranteed Preservation &amp; Consumer Rules:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Historical Records: Modifying terms or prefixes NEVER renames or recalculates old invoices.</li>
              <li>New Invoices: Automatically apply the configured payment terms days and default terms.</li>
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
