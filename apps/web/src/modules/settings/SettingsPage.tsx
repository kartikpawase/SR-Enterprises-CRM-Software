import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Building2, Mail, Phone, ShieldCheck, Database, Sliders } from 'lucide-react';
import { BackupRestoreSection } from './components/BackupRestoreSection';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-fast">
      <PageHeader
        title="System Settings"
        description="Authoritative business configuration, enterprise preferences, and system parameters."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Settings' }]}
      />

      {/* Business & Organization Profile */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden select-none">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-primary-600 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-slate-900">Organization Profile</h2>
              <p className="text-xs text-slate-500">Official business identity displayed on invoices, receipts, and customer documents.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Active Enterprise
          </span>
        </div>

        <div className="p-6 bg-slate-50/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs text-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Business Name</span>
              <p className="text-sm font-bold text-slate-900 font-display">SR ENTERPRISES</p>
              <p className="text-xs text-slate-500">Water Purification Solutions &amp; Services</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs text-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 font-mono">
                <Phone className="w-3 h-3 text-slate-400" /> Support Contact
              </span>
              <p className="text-sm font-bold text-slate-900 font-mono">+91 73850 59197</p>
              <p className="text-xs text-slate-500">Official Customer Line</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs text-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 font-mono">
                <Mail className="w-3 h-3 text-slate-400" /> Official Email
              </span>
              <p className="text-sm font-bold text-slate-900 font-mono">srenterprises02015@gmail.com</p>
              <p className="text-xs text-slate-500">Transactional Dispatch</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial & UPI Gateway Configuration */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden select-none">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-2xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Financial &amp; Payment Parameters</h2>
            <p className="text-xs text-slate-500">Default UPI and invoice settlement gateway credentials.</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs text-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Primary Merchant VPA</span>
              <code className="block text-xs bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg font-mono text-slate-900 font-bold">
                srenterprises6711@aubank
              </code>
              <p className="text-xs text-slate-500">AU Small Finance Bank Merchant UPI Gateway</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs text-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Default Tax Structure</span>
              <p className="text-sm font-bold text-slate-900 font-mono">18.00% Standard GST</p>
              <p className="text-xs text-slate-500">Auto-applied to new product and machine sales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Database & Document Architecture */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden select-none">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-700 shadow-2xs">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">System Architecture</h2>
            <p className="text-xs text-slate-500">Local high-performance transactional core and document generation status.</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider font-mono">Database Engine</span>
              <p className="font-mono font-bold text-slate-900">PostgreSQL / PGlite</p>
              <p className="text-slate-400">ACID Compliant</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider font-mono">PDF Rendering</span>
              <p className="font-mono font-bold text-slate-900">DomPDF CLI Engine</p>
              <p className="text-slate-400">High-Resolution Vector Documents</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider font-mono">Notification Dispatch</span>
              <p className="font-mono font-bold text-slate-900">PHPMailer (Gmail SMTP)</p>
              <p className="text-slate-400">Automated Customer Invoicing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Backup, Automatic Scheduler & Disaster Recovery Engine */}
      <BackupRestoreSection />
    </div>
  );
};

export default SettingsPage;
