import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Droplets,
  ExternalLink,
  CheckCircle2,
  Wrench,
  FileText,
  Receipt,
} from 'lucide-react';
import type { CustomerRecord } from './CustomerTable';

export interface CustomerDetailsPanelProps {
  customer: CustomerRecord;
  onViewFullProfile?: (customer: CustomerRecord) => void;
  onMoreOptions?: (customer: CustomerRecord) => void;
}

export const CustomerDetailsPanel: React.FC<CustomerDetailsPanelProps> = ({
  customer,
  onViewFullProfile,
  onMoreOptions,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'services' | 'invoices' | 'payments'>('overview');

  const assetsCount = customer.assetsCount ?? (customer.assets?.length || 0);
  const servicesCount = customer.servicesCount ?? (customer.services?.length || 0);
  const invoicesCount = customer.invoicesCount ?? (customer.invoices?.length || 0);
  const paymentsCount = customer.paymentsCount ?? (customer.payments?.length || 0);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'assets', label: `Assets (${assetsCount})` },
    { id: 'services', label: `Services (${servicesCount})` },
    { id: 'invoices', label: `Invoices (${invoicesCount})` },
    { id: 'payments', label: `Payments (${paymentsCount})` },
  ] as const;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col gap-4.5 select-none sticky top-20">
      {/* 1. Panel Header: Avatar + Customer Name + ID + Status + 3-Dot Menu */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 font-mono font-extrabold text-sm flex items-center justify-center border border-sky-200/80 shadow-2xs shrink-0">
            {customer.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-display font-bold text-slate-900 tracking-tight leading-tight">
                {customer.fullName}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 font-mono font-semibold">
                {customer.customerNumber}
              </span>
              {customer.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Inactive</span>
                </span>
              )}
              {customer.customerLabel === 'GOOD' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-[10px] font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Good Customer</span>
                </span>
              )}
              {customer.customerLabel === 'BAD' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200/90 text-[10px] font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  <span>Bad Customer</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top Right 3-dot Menu */}
        <button
          type="button"
          onClick={() => onMoreOptions?.(customer)}
          aria-label="More customer options"
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Customer Detail Tabs */}
      <div className="border-b border-slate-200/90 -mt-1">
        <nav className="flex space-x-4 overflow-x-auto no-scrollbar" aria-label="Customer tabs">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer relative ${
                  isSelected
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Contact Information */}
          <div>
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 font-mono">
              CONTACT INFORMATION
            </h3>
            <div className="space-y-2.5 text-xs">
              {/* Phone */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/80">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 font-medium block leading-none">
                    Phone
                  </span>
                  <span className="text-xs font-semibold text-slate-900 font-mono mt-0.5 block">
                    {customer.phone}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/80">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 font-medium block leading-none">
                    Email
                  </span>
                  <span className="text-xs font-semibold text-slate-900 truncate mt-0.5 block">
                    {customer.email}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/80">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 font-medium block leading-none">
                    Address
                  </span>
                  <span className="text-xs font-medium text-slate-700 leading-relaxed mt-0.5 block">
                    {customer.address}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Summary (2-Column Grid in subtle card) */}
          <div>
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 font-mono">
              SUMMARY
            </h3>
            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 grid grid-cols-2 gap-3.5">
              {/* Total Invoices */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                  TOTAL INVOICES
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 block mt-0.5">
                  {customer.summary.totalInvoices}
                </span>
              </div>

              {/* Outstanding */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                  OUTSTANDING
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-red-700 block mt-0.5">
                  {customer.summary.outstanding}
                </span>
              </div>

              {/* Last Service */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                  LAST SERVICE
                </span>
                <span className="text-xs font-semibold text-slate-800 block mt-0.5 font-mono">
                  {customer.lastServiceDate || '—'}
                </span>
              </div>

              {/* Next Service */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                  NEXT SERVICE
                </span>
                <span className="text-xs font-semibold text-slate-800 block mt-0.5 font-mono">
                  {customer.nextServiceDate || '—'}
                </span>
                {customer.nextServiceDays !== null && customer.nextServiceDays !== undefined && (
                  <span
                    className={`text-[10px] font-bold block mt-0.5 font-mono ${
                      customer.nextServiceDays === 'Expired' ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {customer.nextServiceDays === 'Expired' ? 'Expired' : `${customer.nextServiceDays} days left`}
                  </span>
                )}
              </div>

              {/* Active Warranty */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                  ACTIVE WARRANTY
                </span>
                <span
                  className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${
                    customer.summary.activeWarranty === 'No' ? 'text-slate-600' : 'text-emerald-700'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3 h-3 ${
                      customer.summary.activeWarranty === 'No' ? 'text-slate-400' : 'text-emerald-600'
                    }`}
                  />
                  <span>{customer.summary.activeWarranty}</span>
                </span>
              </div>

              {/* Customer Since */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                  CUSTOMER SINCE
                </span>
                <span className="text-xs font-semibold text-slate-800 block mt-0.5 font-mono">
                  {customer.summary.customerSince}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assets Tab Content */}
      {activeTab === 'assets' && (
        <div className="space-y-2 text-xs">
          {customer.assets && customer.assets.length > 0 ? (
            customer.assets.map((asset: any) => (
              <div key={asset.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                <Droplets className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">
                      {asset.customName || asset.product?.name || asset.productName || asset.assetName || 'Water Purifier Asset'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 font-mono">
                      {asset.status || 'Active'}
                    </span>
                  </div>
                  {asset.serialNumber && (
                    <span className="text-[11px] text-slate-500 block font-mono mt-0.5">
                      SN: {asset.serialNumber}
                    </span>
                  )}
                  {asset.purchaseDate && (
                    <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                      Installed: {new Date(asset.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Droplets className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No assets registered</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No machines or spare parts linked to this customer.</p>
            </div>
          )}
        </div>
      )}

      {/* Services Tab Content */}
      {activeTab === 'services' && (
        <div className="space-y-2 text-xs">
          {customer.services && customer.services.length > 0 ? (
            customer.services.map((srv: any) => (
              <div key={srv.id} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{srv.serviceType || 'Maintenance Service'}</span>
                  <span className="text-[10px] font-bold text-emerald-700 font-mono">{srv.status}</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                  {new Date(srv.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {srv.technician ? ` • Tech: ${srv.technician.displayName || srv.technician.username}` : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Wrench className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No service history</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No maintenance or repair visits recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab Content */}
      {activeTab === 'invoices' && (
        <div className="space-y-2 text-xs">
          {customer.invoices && customer.invoices.length > 0 ? (
            customer.invoices.map((inv: any) => (
              <div key={inv.id} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 font-mono block">{inv.invoiceNumber}</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block font-mono">
                    ₹ {parseFloat(inv.totalAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-bold font-mono ${inv.status === 'PAID' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No invoices generated</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No billing or tax invoices created for this customer.</p>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab Content */}
      {activeTab === 'payments' && (
        <div className="space-y-2 text-xs">
          {customer.payments && customer.payments.length > 0 ? (
            customer.payments.map((pmt: any) => (
              <div key={pmt.id} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 font-mono block">{pmt.paymentNumber || 'Receipt'}</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(pmt.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {pmt.paymentMethod}
                  </span>
                </div>
                <span className="font-bold text-emerald-700 font-mono">
                  ₹ {parseFloat(pmt.amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Receipt className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No payment receipts</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No payments or transaction receipts recorded.</p>
            </div>
          )}
        </div>
      )}

      {/* 4. Bottom Full-Width Outlined CTA: "View Full Profile" */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => onViewFullProfile?.(customer)}
          className="w-full py-2.5 px-4 bg-white hover:bg-sky-50 text-primary-600 border border-primary-600 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-2xs text-center flex items-center justify-center gap-2 cursor-pointer group"
        >
          <span>View Full Profile</span>
          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
