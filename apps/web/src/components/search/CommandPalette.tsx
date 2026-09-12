import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Users,
  ShoppingCart,
  FileText,
  Wrench,
  HelpCircle,
  BarChart3,
  ShieldCheck,
  UserCheck,
  Bell,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { useUIStore } from '../../stores/ui-store';
import { useAuth } from '../../providers/AuthBoundary';
import { useGlobalSearch } from '../../modules/search/search.api';
import type { SearchEntityType } from '@crm/types';

interface NavItem {
  id: string;
  label: string;
  path: string;
  subtitle?: string;
  permission?: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

const TYPE_ICONS: Record<SearchEntityType, React.ComponentType<{ className?: string }>> = {
  customer: Users,
  contact: Users,
  asset: Wrench,
  product: ShoppingCart,
  inventory: ShoppingCart,
  sale: ShoppingCart,
  invoice: FileText,
  payment: FileText,
  service: Wrench,
  job_card: Wrench,
  warranty: ShieldCheck,
  technician: UserCheck,
  inquiry: HelpCircle,
};

const COMMAND_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard Overview', path: '/dashboard', icon: LayoutDashboard, category: 'Navigation' },
  { id: 'customers', label: 'Customer Directory', path: '/customers', permission: 'customers.view', icon: Users, category: 'CRM Modules' },
  { id: 'sales', label: 'Sales & Orders', path: '/sales', permission: 'sales.view', icon: ShoppingCart, category: 'CRM Modules' },
  { id: 'invoices', label: 'Invoices & Billing', path: '/invoices', permission: 'invoices.view', icon: FileText, category: 'CRM Modules' },
  { id: 'services', label: 'Services & Maintenance', path: '/services', permission: 'services.view', icon: Wrench, category: 'CRM Modules' },
  { id: 'technicians', label: 'Technician Roster', path: '/technicians', permission: 'technicians.view', icon: UserCheck, category: 'Administration' },
  { id: 'notifications', label: 'System Notifications', path: '/notifications', permission: 'notifications.view', icon: Bell, category: 'Administration' },
  { id: 'settings', label: 'System Settings', path: '/settings', permission: 'settings.manage', icon: Settings, category: 'Administration' },
];

export interface CommandPaletteProps {
  onNavigate: (path: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onNavigate }) => {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const { hasPermission } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live global search across all CRM entities
  const { data: searchData } = useGlobalSearch(
    { q: query, limit: 5 },
    { enabled: commandPaletteOpen && Boolean(query.trim()) }
  );

  // Static navigation command items
  const navItems: NavItem[] = COMMAND_ITEMS.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    if (!query.trim()) return true;
    return (
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
    );
  });

  // Dynamic search items from live database
  const liveResults: NavItem[] = (searchData?.results || []).map((res) => ({
    id: `search-${res.type}-${res.id}`,
    label: res.title,
    subtitle: res.subtitle,
    path: res.navigationTarget,
    icon: TYPE_ICONS[res.type] || FileText,
    category: res.type ? res.type.charAt(0).toUpperCase() + res.type.slice(1).replace(/_/g, ' ') : 'Record',
  }));

  const filteredItems: NavItem[] = query.trim()
    ? [...liveResults, ...navItems]
    : navItems;

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Keyboard navigation within list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        onNavigate(selected.path);
        setCommandPaletteOpen(false);
      }
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global search and navigation"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-20 sm:pt-24 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-fast"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setCommandPaletteOpen(false);
        }
      }}
    >
      <div className="w-full max-w-xl bg-white rounded-modal shadow-modal border border-slate-200/90 overflow-hidden flex flex-col animate-in zoom-in-95 duration-fast">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search modules, pages, actions..."
            className="w-full bg-transparent border-none text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-500 shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Search Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-50">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              No matching modules or actions found for &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === idx;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.path);
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-btn text-xs font-medium transition-colors text-left cursor-pointer ${
                    isSelected ? 'bg-sky-50 text-sky-950' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-md transition-colors ${
                        isSelected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{item.label}</span>
                      <span className="text-[10px] text-slate-500 font-medium block truncate max-w-sm">
                        {item.subtitle ? `${item.category} • ${item.subtitle}` : item.category}
                      </span>
                    </div>
                  </div>

                  <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-primary-600' : 'text-slate-300'}`} />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono shadow-2xs">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono shadow-2xs">↓</kbd>
            <span>Select:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono shadow-2xs">Enter</kbd>
          </div>
          <span className="font-semibold text-slate-600">SR Enterprises CRM</span>
        </div>
      </div>
    </div>
  );
};
