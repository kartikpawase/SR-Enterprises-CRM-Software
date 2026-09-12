import React, { useState, useEffect } from 'react';
import { Shield, Save, RotateCcw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCategorySettingsQuery, useUpdateSettingsMutation, useResetSettingsMutation } from '../settings.api';
import type { SecuritySettings } from '@crm/types';
import { useToast } from '../../../providers/ToastProvider';

export const SecuritySettingsSection: React.FC = () => {
  const toast = useToast();
  const { data, isLoading, error } = useCategorySettingsQuery<SecuritySettings>('SECURITY');
  const updateMutation = useUpdateSettingsMutation<SecuritySettings>();
  const resetMutation = useResetSettingsMutation();

  const [form, setForm] = useState<SecuritySettings>({
    sessionTimeoutMinutes: 1440,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.value) {
      setForm(data.value);
      setIsDirty(false);
    }
  }, [data]);

  const handleChange = (field: keyof SecuritySettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        category: 'SECURITY',
        data: {
          sessionTimeoutMinutes: parseInt(String(form.sessionTimeoutMinutes), 10) || 1440,
          maxLoginAttempts: parseInt(String(form.maxLoginAttempts), 10) || 5,
          lockoutDurationMinutes: parseInt(String(form.lockoutDurationMinutes), 10) || 15,
          passwordMinLength: parseInt(String(form.passwordMinLength), 10) || 8,
          passwordRequireSpecialChar: form.passwordRequireSpecialChar,
        },
        expectedVersion: data?.version,
      });
      setIsDirty(false);
      toast.success('Security policies updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update security settings.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore security policies to system defaults?')) return;
    try {
      await resetMutation.mutateAsync({ category: 'SECURITY' });
      toast.success('Security settings restored to defaults.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset security settings.');
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
        <p className="text-sm">Failed to load security settings: {(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-800 shadow-2xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Access Security &amp; Session Policies</h2>
            <p className="text-xs text-slate-500">Brute-force protection limits, session timeout duration, and credential complexity.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Enforcement Active
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Session Timeout (Minutes) *
            </label>
            <input
              type="number"
              min="15"
              max="10080"
              required
              value={form.sessionTimeoutMinutes}
              onChange={(e) => handleChange('sessionTimeoutMinutes', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">Idle duration before re-authentication.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Max Login Failures *
            </label>
            <input
              type="number"
              min="3"
              max="20"
              required
              value={form.maxLoginAttempts}
              onChange={(e) => handleChange('maxLoginAttempts', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">Lockout triggered after failed attempts.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Lockout Duration (Minutes) *
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              required
              value={form.lockoutDurationMinutes}
              onChange={(e) => handleChange('lockoutDurationMinutes', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">Duration of temporary account lock.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Minimum Password Length *
            </label>
            <input
              type="number"
              min="8"
              max="128"
              required
              value={form.passwordMinLength}
              onChange={(e) => handleChange('passwordMinLength', e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900 font-bold"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.passwordRequireSpecialChar}
              onChange={(e) => handleChange('passwordRequireSpecialChar', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Require Special Character in Passwords</span>
              <p className="text-[11px] text-slate-500">Enforces presence of at least one symbol (!@#$%^&amp;*).</p>
            </div>
          </label>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Enterprise Security Guarantees:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Passwords and cryptographic secrets are NEVER stored in settings.</li>
              <li>Authentication logic enforces server-side rate limits and lockout timers.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          Version: {data?.version ?? 1} • Source: PostgreSQL app_settings (SECURITY)
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
