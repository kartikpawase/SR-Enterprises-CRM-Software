import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  Building2,
  FileText,
  ShoppingCart,
  Package,
  Wrench,
  Percent,
  Hash,
  Bell,
  Globe,
  Shield,
  LayoutDashboard,
  Bot,
  Database,
  History,
} from 'lucide-react';
import { BusinessSettingsSection } from './components/BusinessSettingsSection';
import { InvoiceSettingsSection } from './components/InvoiceSettingsSection';
import { SalesPaymentSettingsSection } from './components/SalesPaymentSettingsSection';
import { InventorySettingsSection } from './components/InventorySettingsSection';
import { ServiceSettingsSection } from './components/ServiceSettingsSection';
import { TaxSettingsSection } from './components/TaxSettingsSection';
import { NumberingSettingsSection } from './components/NumberingSettingsSection';
import { NotificationSettingsSection } from './components/NotificationSettingsSection';
import { LocalizationSettingsSection } from './components/LocalizationSettingsSection';
import { SecuritySettingsSection } from './components/SecuritySettingsSection';
import { DashboardSettingsSection } from './components/DashboardSettingsSection';
import { SettingsAuditLogSection } from './components/SettingsAuditLogSection';
import { TrainChatbotSection } from './components/TrainChatbotSection';
import { BackupRestoreSection } from './components/BackupRestoreSection';

type SettingsTab =
  | 'business'
  | 'invoice'
  | 'sales'
  | 'inventory'
  | 'service'
  | 'tax'
  | 'numbering'
  | 'notifications'
  | 'localization'
  | 'security'
  | 'dashboard'
  | 'chatbot'
  | 'backup'
  | 'audit';

interface TabDefinition {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const SETTINGS_TABS: TabDefinition[] = [
  { id: 'business', label: 'Organization', icon: Building2 },
  { id: 'invoice', label: 'Invoices', icon: FileText },
  { id: 'sales', label: 'Sales & Payment', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'service', label: 'Services & Jobs', icon: Wrench },
  { id: 'tax', label: 'Tax & GST', icon: Percent },
  { id: 'numbering', label: 'Numbering', icon: Hash },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'localization', label: 'System & Locale', icon: Globe },
  { id: 'security', label: 'Security & Access', icon: Shield },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chatbot', label: 'AI Chatbot', icon: Bot },
  { id: 'backup', label: 'Backup & Recovery', icon: Database },
  { id: 'audit', label: 'Audit Trail', icon: History },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('business');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-fast">
      <PageHeader
        title="System Settings"
        description="Authoritative business configuration, enterprise parameters, and sequential numbering rules."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Settings' }]}
      />

      {/* Responsive Horizontal Navigation Pills */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Panel */}
      <div className="transition-all duration-150">
        {activeTab === 'business' && <BusinessSettingsSection />}
        {activeTab === 'invoice' && <InvoiceSettingsSection />}
        {activeTab === 'sales' && <SalesPaymentSettingsSection />}
        {activeTab === 'inventory' && <InventorySettingsSection />}
        {activeTab === 'service' && <ServiceSettingsSection />}
        {activeTab === 'tax' && <TaxSettingsSection />}
        {activeTab === 'numbering' && <NumberingSettingsSection />}
        {activeTab === 'notifications' && <NotificationSettingsSection />}
        {activeTab === 'localization' && <LocalizationSettingsSection />}
        {activeTab === 'security' && <SecuritySettingsSection />}
        {activeTab === 'dashboard' && <DashboardSettingsSection />}
        {activeTab === 'chatbot' && <TrainChatbotSection />}
        {activeTab === 'backup' && <BackupRestoreSection />}
        {activeTab === 'audit' && <SettingsAuditLogSection />}
      </div>
    </div>
  );
};

export default SettingsPage;
