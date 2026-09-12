import React, { useState, useEffect } from 'react';
import { Wrench, Save, RotateCcw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useCategorySettingsQuery, useUpdateSettingsMutation, useResetSettingsMutation } from '../settings.api';
import type { ServiceSettings, JobCardSettings } from '@crm/types';
import { useToast } from '../../../providers/ToastProvider';

export const ServiceSettingsSection: React.FC = () => {
  const toast = useToast();
  const serviceQuery = useCategorySettingsQuery<ServiceSettings>('SERVICE');
  const jobCardQuery = useCategorySettingsQuery<JobCardSettings>('JOB_CARD');

  const updateServiceMutation = useUpdateSettingsMutation<ServiceSettings>();
  const updateJobCardMutation = useUpdateSettingsMutation<JobCardSettings>();
  const resetServiceMutation = useResetSettingsMutation();
  const resetJobCardMutation = useResetSettingsMutation();

  const [serviceForm, setServiceForm] = useState<ServiceSettings>({
    defaultServiceDurationMinutes: 60,
    defaultServicePriority: 'MEDIUM',
    slaHours: 24,
    autoCreateJobCardOnService: true,
  });

  const [jobCardForm, setJobCardForm] = useState<JobCardSettings>({
    prefix: 'JC',
    defaultPriority: 'NORMAL',
    requireCustomerSignature: false,
    requireOtpVerification: false,
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (serviceQuery.data?.value) {
      setServiceForm(serviceQuery.data.value);
    }
  }, [serviceQuery.data]);

  useEffect(() => {
    if (jobCardQuery.data?.value) {
      setJobCardForm(jobCardQuery.data.value);
    }
  }, [jobCardQuery.data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([
        updateServiceMutation.mutateAsync({
          category: 'SERVICE',
          data: {
            ...serviceForm,
            defaultServiceDurationMinutes: Number(serviceForm.defaultServiceDurationMinutes),
            slaHours: Number(serviceForm.slaHours),
          },
          expectedVersion: serviceQuery.data?.version,
        }),
        updateJobCardMutation.mutateAsync({
          category: 'JOB_CARD',
          data: jobCardForm,
          expectedVersion: jobCardQuery.data?.version,
        }),
      ]);
      setIsDirty(false);
      toast.success('Service and job card defaults saved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update service settings.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore service defaults to system defaults?')) return;
    try {
      await Promise.all([
        resetServiceMutation.mutateAsync({ category: 'SERVICE' }),
        resetJobCardMutation.mutateAsync({ category: 'JOB_CARD' }),
      ]);
      toast.success('Service settings restored to defaults.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset service settings.');
    }
  };

  const isLoading = serviceQuery.isLoading || jobCardQuery.isLoading;

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
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-primary-600 shadow-2xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Service &amp; Job Card Parameters</h2>
            <p className="text-xs text-slate-500">Default doorstep service visit duration, SLA escalation thresholds, and job card verification.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Live Consumer Active
          </span>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetServiceMutation.isPending || resetJobCardMutation.isPending}
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
              Default Service Priority *
            </label>
            <select
              value={serviceForm.defaultServicePriority}
              onChange={(e) => {
                setServiceForm((prev) => ({ ...prev, defaultServicePriority: e.target.value as any }));
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-slate-900 cursor-pointer"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM (Standard Doorstep)</option>
              <option value="HIGH">HIGH (Urgent Filtration Breakdown)</option>
              <option value="URGENT">URGENT (Immediate Leakage / Emergency)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Visit Duration (Minutes) *
            </label>
            <input
              type="number"
              min="15"
              max="1440"
              required
              value={serviceForm.defaultServiceDurationMinutes}
              onChange={(e) => {
                setServiceForm((prev) => ({ ...prev, defaultServiceDurationMinutes: parseInt(e.target.value, 10) || 15 }));
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              SLA Resolution Target (Hours) *
            </label>
            <input
              type="number"
              min="1"
              max="720"
              required
              value={serviceForm.slaHours}
              onChange={(e) => {
                setServiceForm((prev) => ({ ...prev, slaHours: parseInt(e.target.value, 10) || 1 }));
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Job Card Identifier Prefix *
            </label>
            <input
              type="text"
              required
              value={jobCardForm.prefix}
              onChange={(e) => {
                setJobCardForm((prev) => ({ ...prev, prefix: e.target.value.toUpperCase() }));
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-slate-900"
              placeholder="JC"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={serviceForm.autoCreateJobCardOnService}
              onChange={(e) => {
                setServiceForm((prev) => ({ ...prev, autoCreateJobCardOnService: e.target.checked }));
                setIsDirty(true);
              }}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Auto-Generate Job Card on Service Booking</span>
              <p className="text-[11px] text-slate-500">Automatically creates digital technician job card.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={jobCardForm.requireCustomerSignature}
              onChange={(e) => {
                setJobCardForm((prev) => ({ ...prev, requireCustomerSignature: e.target.checked }));
                setIsDirty(true);
              }}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">Require Customer Signature on Job Completion</span>
              <p className="text-[11px] text-slate-500">Requires digital sign-off before closing service ticket.</p>
            </div>
          </label>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Operational Consumers:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>New Service Booking: Auto-applies default duration and priority.</li>
              <li>Job Cards: Sequential numbers generated with prefix {jobCardForm.prefix}.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          Source: PostgreSQL app_settings (SERVICE &amp; JOB_CARD)
        </span>
        <button
          type="submit"
          disabled={!isDirty || updateServiceMutation.isPending || updateJobCardMutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {updateServiceMutation.isPending || updateJobCardMutation.isPending ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>
    </form>
  );
};
