import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Home,
  Repeat,
  BellRing,
  Phone,
  User,
  Clock,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  IndianRupee,
  ShieldCheck,
} from 'lucide-react';
import {
  type DueServiceItem,
  type DueRentalItem,
  type DueOtherActivityItem,
} from '../dues.api';
import { formatINR } from '../../../lib/formatters';
import { cn } from '../../../lib/utils';

// Helper for status styling
function getStatusBadge(status: string) {
  const s = status.toUpperCase();
  if (['PAID', 'COMPLETED', 'INSTALLED', 'ACTIVE'].includes(s)) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200/90';
  }
  if (['OVERDUE', 'FAILED', 'CANCELLED', 'TERMINATED'].includes(s)) {
    return 'bg-rose-50 text-rose-800 border-rose-200/90';
  }
  if (['DUE', 'PAYMENT_DUE', 'ASSIGNED', 'IN_PROGRESS'].includes(s)) {
    return 'bg-amber-50 text-amber-800 border-amber-200/90';
  }
  return 'bg-sky-50 text-sky-800 border-sky-200/90';
}

function getPriorityBadge(priority: string) {
  const p = (priority || 'NORMAL').toUpperCase();
  if (p === 'URGENT' || p === 'HIGH') {
    return 'bg-rose-100 text-rose-800 font-extrabold';
  }
  return 'bg-slate-100 text-slate-700 font-semibold';
}

// ==========================================
// 1. SERVICES LIST COMPONENT
// ==========================================
export const DuesServicesList: React.FC<{ items: DueServiceItem[] }> = ({ items }) => {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-100/80 text-primary-700 flex items-center justify-center">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-slate-900">
              Services &amp; Workshop Activities
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              In-shop maintenance, repairs and workshop jobs scheduled for this date
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200/80">
          {items.length} {items.length === 1 ? 'Job' : 'Jobs'}
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((srv) => (
          <div
            key={srv.id}
            className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200/60">
                  {srv.serviceNumber}
                </span>
                <span className="font-bold text-xs text-slate-900">
                  {srv.serviceType.replace(/_/g, ' ')}
                </span>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(srv.status))}>
                  {srv.status}
                </span>
                {srv.priority && srv.priority !== 'NORMAL' && (
                  <span className={cn('px-1.5 py-0.2 rounded text-[10px]', getPriorityBadge(srv.priority))}>
                    {srv.priority}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                <button
                  type="button"
                  onClick={() => navigate(`/customers/${srv.customerId}`)}
                  className="inline-flex items-center gap-1.5 text-slate-900 font-semibold hover:text-primary-600 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{srv.customerName}</span>
                </button>

                <a
                  href={`tel:${srv.customerPhone}`}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-primary-600"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{srv.customerPhone}</span>
                </a>

                <div className="inline-flex items-center gap-1 text-slate-500">
                  <span className="font-bold text-slate-700">Machine:</span>
                  <span>{srv.machineModel}</span>
                  {srv.machineSerialNumber && (
                    <span className="font-mono text-[10px] text-slate-400">({srv.machineSerialNumber})</span>
                  )}
                </div>

                {srv.technicianName && (
                  <div className="inline-flex items-center gap-1 text-slate-700 font-medium">
                    <span className="text-slate-400">Technician:</span>
                    <span>{srv.technicianName}</span>
                  </div>
                )}

                {srv.scheduledTimeSlot && (
                  <div className="inline-flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{srv.scheduledTimeSlot}</span>
                  </div>
                )}
              </div>

              {(srv.customerNotes || srv.internalNotes) && (
                <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1.5 max-w-2xl">
                  {srv.customerNotes || srv.internalNotes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/services/${srv.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
              >
                <span>View Service</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 2. DOORSTEP VISITS LIST COMPONENT
// ==========================================
export const DuesDoorstepVisitsList: React.FC<{ items: DueServiceItem[] }> = ({ items }) => {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-amber-50/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-slate-900">
              Doorstep Visits &amp; Field Jobs
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              On-site visits and client premises service appointments scheduled for this date
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100/70 text-amber-900 border border-amber-200">
          {items.length} {items.length === 1 ? 'Visit' : 'Visits'}
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((visit) => (
          <div
            key={visit.id}
            className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {visit.serviceNumber}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  <Home className="w-2.5 h-2.5" /> Doorstep
                </span>
                <span className="font-bold text-xs text-slate-900">
                  {visit.serviceType.replace(/_/g, ' ')}
                </span>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(visit.status))}>
                  {visit.status}
                </span>
                {visit.priority && visit.priority !== 'NORMAL' && (
                  <span className={cn('px-1.5 py-0.2 rounded text-[10px]', getPriorityBadge(visit.priority))}>
                    {visit.priority}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                <button
                  type="button"
                  onClick={() => navigate(`/customers/${visit.customerId}`)}
                  className="inline-flex items-center gap-1.5 text-slate-900 font-semibold hover:text-primary-600 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{visit.customerName}</span>
                </button>

                <a
                  href={`tel:${visit.customerPhone}`}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-primary-600"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{visit.customerPhone}</span>
                </a>

                <div className="inline-flex items-center gap-1 text-slate-500">
                  <span className="font-bold text-slate-700">Machine:</span>
                  <span>{visit.machineModel}</span>
                </div>

                {visit.technicianName && (
                  <div className="inline-flex items-center gap-1 text-slate-800 font-semibold">
                    <span className="text-slate-400 font-normal">Assigned:</span>
                    <span>{visit.technicianName}</span>
                  </div>
                )}

                {visit.scheduledTimeSlot && (
                  <div className="inline-flex items-center gap-1 text-slate-600 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{visit.scheduledTimeSlot}</span>
                  </div>
                )}
              </div>

              {visit.address && (
                <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{visit.address}</span>
                </div>
              )}

              {(visit.customerNotes || visit.internalNotes) && (
                <p className="text-[11px] text-slate-500 italic bg-amber-50/30 p-2 rounded-lg border border-amber-100/60 mt-1.5 max-w-2xl">
                  {visit.customerNotes || visit.internalNotes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/services/${visit.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
              >
                <span>View Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 3. RENTAL DUES LIST COMPONENT
// ==========================================
export const DuesRentalsList: React.FC<{ items: DueRentalItem[] }> = ({ items }) => {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-slate-900">
              Rental Payment Dues
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Recurring subscription rental payments with due date matching this date
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100/70 text-emerald-900 border border-emerald-200">
          {items.length} {items.length === 1 ? 'Subscription' : 'Subscriptions'}
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((rnt) => (
          <div
            key={rnt.id}
            className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {rnt.rentalNumber}
                </span>
                <span className="font-bold text-xs text-slate-900">
                  {rnt.machineModel} ({rnt.machineType})
                </span>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(rnt.paymentStatus))}>
                  Payment: {rnt.paymentStatus}
                </span>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(rnt.rentalStatus))}>
                  Rental: {rnt.rentalStatus}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                <button
                  type="button"
                  onClick={() => navigate(`/customers/${rnt.customerId}`)}
                  className="inline-flex items-center gap-1.5 text-slate-900 font-semibold hover:text-primary-600 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{rnt.customerName}</span>
                </button>

                <a
                  href={`tel:${rnt.customerPhone}`}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-primary-600"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{rnt.customerPhone}</span>
                </a>

                <div className="inline-flex items-center gap-1">
                  <span className="text-slate-400">Serial:</span>
                  <span className="font-mono text-slate-700">{rnt.serialNumber}</span>
                </div>

                <div className="inline-flex items-center gap-1 text-slate-500">
                  <span>Frequency:</span>
                  <span className="font-bold text-slate-700">{rnt.billingFrequency}</span>
                </div>
              </div>

              {rnt.installationAddress && (
                <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{rnt.installationAddress}</span>
                </div>
              )}
            </div>

            {/* Right: Amount and Action */}
            <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                  Rent Due
                </span>
                <span className="text-base font-extrabold text-slate-900 font-mono">
                  {formatINR(rnt.billingAmount || rnt.monthlyRent)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/rent')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
              >
                <span>Open Rentals</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 4. OTHER SCHEDULED ACTIVITIES LIST
// ==========================================
export const DuesOtherActivitiesList: React.FC<{ items: DueOtherActivityItem[] }> = ({ items }) => {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-indigo-50/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-slate-900">
              Other Scheduled Activities &amp; Reminders
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Invoice payment deadlines, customer follow-up reminders, and planned warranty intervals
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100/70 text-indigo-900 border border-indigo-200">
          {items.length} {items.length === 1 ? 'Activity' : 'Activities'}
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((act) => (
          <div
            key={act.id}
            className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border',
                    act.activityType === 'INVOICE_DUE'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : act.activityType === 'WARRANTY_SCHEDULE'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  )}
                >
                  {act.activityType.replace(/_/g, ' ')}
                </span>
                <span className="font-bold text-xs text-slate-900">{act.title}</span>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(act.status))}>
                  {act.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                <button
                  type="button"
                  onClick={() => navigate(`/customers/${act.customerId}`)}
                  className="inline-flex items-center gap-1 text-slate-900 font-semibold hover:text-primary-600 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{act.customerName}</span>
                </button>

                <a
                  href={`tel:${act.customerPhone}`}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-primary-600"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{act.customerPhone}</span>
                </a>

                {act.details && (
                  <span className="text-slate-500 font-normal">{act.details}</span>
                )}
              </div>
            </div>

            {act.amount && (
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                  Amount
                </span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">
                  {formatINR(act.amount)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
