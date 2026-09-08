import React from 'react';
import {
  Users,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  Briefcase,
  ChevronRight,
  Edit2,
  Trash2,
} from 'lucide-react';
import type { TechnicianItem } from '../technicians.api';

export interface TechnicianTableProps {
  technicians?: TechnicianItem[];
  isLoading?: boolean;
  onViewDetail: (tech: TechnicianItem) => void;
  onEdit: (tech: TechnicianItem) => void;
  onDelete?: (tech: TechnicianItem) => void;
}

export const TechnicianTable: React.FC<TechnicianTableProps> = ({
  technicians = [],
  isLoading,
  onViewDetail,
  onEdit,
  onDelete,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Active
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            On Leave
          </span>
        );
      case 'INACTIVE':
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertCircle className="w-3 h-3 text-slate-500" />
            Inactive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100/80 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-xl p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/80 flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-base font-display font-bold text-slate-900">No Technicians Found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto font-medium">
          No technicians match your search or filter. You can add a new technician to your service fleet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden select-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              <th className="py-3 px-4">Technician</th>
              <th className="py-3 px-4">Contact Info</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Skills &amp; Specialization</th>
              <th className="py-3 px-4 text-center">Active Jobs</th>
              <th className="py-3 px-4 text-center">Completed</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {technicians.map((t) => (
              <tr
                key={t.id}
                className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                onClick={() => onViewDetail(t)}
              >
                {/* Technician name & avatar */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 font-mono font-bold text-sm flex items-center justify-center shrink-0 border border-sky-200/80 shadow-2xs">
                      {t.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{t.fullName}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        Joined {new Date(t.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td className="py-3.5 px-4">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-xs font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {t.phone}
                    </div>
                    {t.email && (
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {t.email}
                      </div>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>

                {/* Skills */}
                <td className="py-3.5 px-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {t.skills && t.skills.length > 0 ? (
                      t.skills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold border border-slate-200/60"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">General Technician</span>
                    )}
                  </div>
                </td>

                {/* Active Jobs */}
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                      (t.activeJobsCount || 0) > 0
                        ? 'bg-sky-50 text-sky-800 border-sky-200/80'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Briefcase className="w-3 h-3" />
                    {t.activeJobsCount || 0}
                  </span>
                </td>

                {/* Completed Jobs */}
                <td className="py-3.5 px-4 text-center font-bold font-mono text-slate-900 text-xs">
                  {t.completedJobsCount || 0}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onEdit(t)}
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(t)}
                        className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Technician"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onViewDetail(t)}
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
