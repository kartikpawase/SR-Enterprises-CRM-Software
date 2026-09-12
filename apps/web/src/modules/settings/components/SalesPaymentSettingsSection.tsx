import React, { useState, useEffect } from 'react';
import { ShoppingCart, CreditCard, Save, RotateCcw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCategorySettingsQuery, useUpdateSettingsMutation, useResetSettingsMutation } from '../settings.api';
import type { SalesSettings, PaymentSettings } from '@crm/types';
import { useToast } from '../../../providers/ToastProvider';

export const SalesPaymentSettingsSection: React.FC = () => {
  const toast = useToast();
  const salesQuery = useCategorySettingsQuery<SalesSettings>('SALES');
  const paymentQuery = useCategorySettingsQuery<PaymentSettings>('PAYMENT');

  const updateSalesMutation = useUpdateSettingsMutation<SalesSettings>();
  const updatePaymentMutation = useUpdateSettingsMutation<PaymentSettings>();
  const resetSalesMutation = useResetSettingsMutation();
  const resetPaymentMutation = useResetSettingsMutation();

  const [salesForm, setSalesForm] = useState<SalesSettings>({
    defaultSalesStatus: 'COMPLETED',
    autoGenerateInvoiceOnSale: true,
    autoCreateAssetOnSale: true,
    autoCreateWarrantyOnSale: true,
  });

  const [paymentForm, setPaymentForm] = useState<PaymentSettings>({
    defaultPaymentMethod: 'UPI',
    defaultDuePeriodDays: 30,
    allowPartialPayments: true,
    autoGenerateReceipts: true,
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (salesQuery.data?.value) {
      setSalesForm(salesQuery.data.value);
    }
  }, [salesQuery.data]);

  useEffect(() => {
    if (paymentQuery.data?.value) {
      setPaymentForm(paymentQuery.data.value);
    }
  }, [paymentQuery.data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([
        updateSalesMutation.mutateAsync({
          category: 'SALES',
          data: salesForm,
          expectedVersion: salesQuery.data?.version,
        }),
        updatePaymentMutation.mutateAsync({
          category: 'PAYMENT',
          data: {
            ...paymentForm,
            defaultDuePeriodDays: Number(paymentForm.defaultDuePeriodDays),
          },
          expectedVersion: paymentQuery.data?.version,
        }),
      ]);
      setIsDirty(false);
      toast.success('Sales & payment parameters updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update sales & payment settings.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore sales and payment parameters to system defaults?')) return;
    try {
      await Promise.all([
        resetSalesMutation.mutateAsync({ category: 'SALES' }),
        resetPaymentMutation.mutateAsync({ category: 'PAYMENT' }),
      ]);
      toast.success('Sales & payment settings restored to defaults.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset settings.');
    }
  };

  const isLoading = salesQuery.isLoading || paymentQuery.isLoading;

  if (isLoading) {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-20 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-2xs">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Sales &amp; Settlement Parameters</h2>
            <p className="text-xs text-slate-500">Order workflow defaults, primary settlement method, and automated billing triggers.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Live Consumer Active
          </span>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetSalesMutation.isPending || resetPaymentMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Default Order Status *
            </label>
            <select
              value={salesForm.defaultSalesStatus}
              onChange={(e) => {
                setSalesForm((prev) => ({ ...prev, defaultSalesStatus: e.target.value as any }));
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900 cursor-pointer"
            >
              <option value="COMPLETED">COMPLETED (Direct Settlement &amp; Dispatch)</option>
              <option value="DRAFT">DRAFT (Pending Confirmation)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Default status assigned when entering new orders.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Default Payment Method *
            </label>
            <select
              value={paymentForm.defaultPaymentMethod}
              onChange={(e) => {
                setPaymentForm((prev) => ({ ...prev, defaultPaymentMethod: e.target.value as any }));
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900 cursor-pointer"
            >
              <option value="UPI">UPI (Unified Payments Interface)</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="CARD">Debit / Credit Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="NET_BANKING">Net Banking</option>
              <option value="OTHER">Other</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Pre-selected method in payment entry dialogues.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Default Payment Due Window (Days) *
            </label>
            <input
              type="number"
              min="0"
              max="365"
              required
              value={paymentForm.defaultDuePeriodDays}
              onChange={(e) => {
                setPaymentForm((prev) => ({ ...prev, defaultDuePeriodDays: parseInt(e.target.value, 10) || 0 }));
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={salesForm.autoGenerateInvoiceOnSale}
              onChange={(e) => {
                setSalesForm((prev) => ({ ...prev, autoGenerateInvoiceOnSale: e.target.checked }));
                setIsDirty(true);
              }}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Auto-Generate Tax Invoice on Completed Sale</span>
              <p className="text-[11px] text-slate-500">Automatically creates linked invoice with items snapshot.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={paymentForm.allowPartialPayments}
              onChange={(e) => {
                setPaymentForm((prev) => ({ ...prev, allowPartialPayments: e.target.checked }));
                setIsDirty(true);
              }}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Allow Partial Settlements</span>
              <p className="text-[11px] text-slate-500">Permits split payments and outstanding balance tracking.</p>
            </div>
          </label>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Real Consumer Effect:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Changing Default Payment Method pre-selects that method on all new sales and payment records.</li>
              <li>Existing sales, invoices, and payments remain strictly unmodified.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          Source: PostgreSQL app_settings (SALES &amp; PAYMENT)
        </span>
        <button
          type="submit"
          disabled={!isDirty || updateSalesMutation.isPending || updatePaymentMutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {updateSalesMutation.isPending || updatePaymentMutation.isPending ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>
    </form>
  );
};
