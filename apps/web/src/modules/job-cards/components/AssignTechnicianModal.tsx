import React, { useState } from 'react';
import { X, UserCheck, AlertCircle, MessageSquare } from 'lucide-react';
import { useAssignTechnicianMutation, type JobCardItem } from '../job-cards.api';
import type { TechnicianItem } from '../../technicians/technicians.api';

export interface AssignTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobCard: JobCardItem | null;
  technicians: TechnicianItem[];
}

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
  isOpen,
  onClose,
  jobCard,
  technicians,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string>(jobCard?.technicianId || '');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const assignMutation = useAssignTechnicianMutation();

  if (!isOpen || !jobCard) return null;

  const activeTechnicians = technicians.filter((t) => t.status === 'ACTIVE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId) {
      setError('Please select an active technician');
      return;
    }

    setError(null);
    try {
      await assignMutation.mutateAsync({
        id: jobCard.id,
        data: {
          technicianId: selectedTechId,
          notes: notes.trim() || undefined,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to assign technician');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Assign Technician</h3>
              <p className="text-xs text-slate-700">Job Card: {jobCard.jobCardNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Job Card Context Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-700">Customer:</span>
              <span className="font-semibold text-slate-900">{jobCard.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Asset:</span>
              <span className="font-semibold text-slate-900">{jobCard.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Service:</span>
              <span className="font-semibold text-slate-900">{jobCard.serviceNumber} ({jobCard.serviceType})</span>
            </div>
          </div>

          {/* Technician Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Field Technician <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">-- Choose Active Technician --</option>
              {activeTechnicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.phone}) — {t.activeJobsCount || 0} active jobs
                </option>
              ))}
            </select>
            {activeTechnicians.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No active technicians available.</p>
            )}
          </div>

          {/* Dispatch Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assignment Notes / Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Please bring extra carbon filters and TDS meter..."
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* WhatsApp Notification Indicator */}
          <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>A WhatsApp assignment notification will be automatically dispatched to the technician.</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignMutation.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
