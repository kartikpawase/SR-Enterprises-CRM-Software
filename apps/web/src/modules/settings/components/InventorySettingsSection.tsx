import React, { useState, useEffect } from 'react';
import { Package, Save, RotateCcw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCategorySettingsQuery, useUpdateSettingsMutation, useResetSettingsMutation } from '../settings.api';
import type { InventorySettings } from '@crm/types';
import { useToast } from '../../../providers/ToastProvider';

export const InventorySettingsSection: React.FC = () => {
  const toast = useToast();
  const { data, isLoading, error } = useCategorySettingsQuery<InventorySettings>('INVENTORY');
  const updateMutation = useUpdateSettingsMutation<InventorySettings>();
  const resetMutation = useResetSettingsMutation();

  const [form, setForm] = useState<InventorySettings>({
    lowStockThreshold: 5,
    allowNegativeStock: false,
    valuationMethod: 'FIFO',
    skuPrefix: 'SR',
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.value) {
      setForm(data.value);
      setIsDirty(false);
    }
  }, [data]);

  const handleChange = (field: keyof InventorySettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        category: 'INVENTORY',
        data: {
          ...form,
          lowStockThreshold: parseInt(String(form.lowStockThreshold), 10) || 0,
        },
        expectedVersion: data?.version,
      });
      setIsDirty(false);
      toast.success('Inventory parameters updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update inventory settings.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore inventory parameters to system defaults?')) return;
    try {
      await resetMutation.mutateAsync({ category: 'INVENTORY' });
      toast.success('Inventory settings restored to defaults.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset inventory settings.');
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
        <p className="text-sm">Failed to load inventory settings: {(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-2xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Inventory &amp; Stock Controls</h2>
            <p className="text-xs text-slate-500">Low stock alert limits, warehouse valuation methods, and negative balance protection.</p>
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
              Low Stock Warning Threshold *
            </label>
            <input
              type="number"
              min="0"
              max="10000"
              required
              value={form.lowStockThreshold}
              onChange={(e) => handleChange('lowStockThreshold', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">Products at or below this quantity trigger low-stock alerts.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Stock Valuation Method
            </label>
            <select
              value={form.valuationMethod}
              onChange={(e) => handleChange('valuationMethod', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900 cursor-pointer"
            >
              <option value="FIFO">FIFO (First In, First Out)</option>
              <option value="WEIGHTED_AVERAGE">Weighted Average Cost</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Used for calculating profit margin and asset valuation.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Default SKU / Part Prefix
            </label>
            <input
              type="text"
              value={form.skuPrefix || ''}
              onChange={(e) => handleChange('skuPrefix', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
              placeholder="SR"
            />
            <p className="text-[11px] text-slate-500 mt-1">Auto-assigned when creating new inventory items.</p>
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.allowNegativeStock}
              onChange={(e) => handleChange('allowNegativeStock', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Allow Negative Stock Levels</span>
              <p className="text-[11px] text-slate-500">Allows recording sales and allocations when physical stock is zero.</p>
            </div>
          </label>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Live Consumer Enforcement:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Inventory Management: Items with stock &le; {form.lowStockThreshold} are marked as low stock in table &amp; filters.</li>
              <li>Operational Dashboard: Low Stock alerts counter evaluates against this threshold.</li>
              <li>Automated Alerts: Workflow engine dispatches warning notifications based on this threshold.</li>
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
