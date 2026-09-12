import React from 'react';
import {
  WifiOff,
  RefreshCw,
  Search,
  Menu,
  Bell,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useNetworkStatus } from '../providers/NetworkStatusProvider';
import { useAuth } from '../providers/AuthBoundary';
import { useUIStore } from '../stores/ui-store';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { CommandPalette } from '../components/search/CommandPalette';
import { NotificationCenter } from '../components/notifications/NotificationCenter';
import { GlobalSidebar } from '../components/navigation/GlobalSidebar';
import { ChatbotWidget } from '../components/chatbot/ChatbotWidget';
import { useUnreadNotificationCountQuery } from '../modules/notifications/notifications.api';
import { cn } from '../lib/utils';

export interface AppShellProps {
  children?: React.ReactNode;
  activePath?: string;
  onNavigate?: (path: string) => void;
}

export function AppShell({ children, activePath = '/dashboard', onNavigate }: AppShellProps) {
  const { status, isOnline } = useNetworkStatus();
  const { user, logout } = useAuth();
  const { data: unreadData } = useUnreadNotificationCountQuery();
  const unreadCount = unreadData?.unreadCount ?? 0;
  const {
    sidebarState,
    mobileNavOpen,
    collapseSidebar,
    setMobileNavOpen,
    setCommandPaletteOpen,
    setNotificationCenterOpen,
    resetSidebarOnLogout,
  } = useUIStore();

  const handleNavClick = (path: string) => {
    onNavigate?.(path);
    setMobileNavOpen(false);
  };

  // Outside click on workspace collapses the sidebar
  const handleWorkspaceClick = () => {
    if (sidebarState === 'expanded' || sidebarState === 'manuallyExpanded' || sidebarState === 'hoverExpanded') {
      collapseSidebar();
    }
  };

  const userMenuItems = [
    {
      id: 'profile',
      label: 'My Account',
      icon: <UserIcon className="w-4 h-4 text-slate-500" />,
      onClick: () => handleNavClick('/settings'),
    },
    'divider' as const,
    {
      id: 'logout',
      label: 'Sign Out',
      destructive: true,
      icon: <LogOut className="w-4 h-4 text-danger-600" />,
      onClick: async () => {
        resetSidebarOnLogout();
        await logout();
        onNavigate?.('/login');
      },
    },
  ];

  const isDesktopExpandedOffset =
    sidebarState === 'expanded' || sidebarState === 'manuallyExpanded';

  return (
    <div className="min-h-screen bg-workspace flex flex-col font-sans relative print:bg-white print:min-h-0 print:p-0 print:m-0">
      {/* Network Connectivity Notification Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs z-50 print:hidden">
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode: Working with cached data. Changes will synchronize upon reconnection.</span>
        </div>
      )}
      {status === 'syncing' && (
        <div className="bg-primary-600 text-white px-4 py-1 text-xs font-medium flex items-center justify-center gap-2 z-50 print:hidden">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Synchronizing state with server...</span>
        </div>
      )}

      {/* Authoritative Permanent Global Master Sidebar */}
      <GlobalSidebar activePath={activePath} onNavigate={handleNavClick} />

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs md:hidden print:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Application Layout Container */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-200 ease-out print:pl-0 print:m-0 print:p-0',
          isDesktopExpandedOffset ? 'md:pl-[136px]' : 'md:pl-[68px]'
        )}
      >
        {/* Top Application Header */}
        <header
          onClick={handleWorkspaceClick}
          className="h-16 bg-white border-b border-slate-200/90 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs print:hidden"
        >
          <div className="flex items-center gap-3">
            {/* Mobile Navigation Hamburger Toggle */}
            <button
              type="button"
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={(e) => {
                e.stopPropagation();
                setMobileNavOpen(!mobileNavOpen);
              }}
              aria-label="Toggle mobile navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Section context */}
            <div className="flex flex-col min-w-0">
              <span className="font-display font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight block truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                SR ENTERPRISES CRM
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider hidden xs:block">
                Water Purifier &amp; RO Management
              </span>
            </div>
          </div>

          {/* Header Actions: Search, Connectivity, Notifications, User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Mobile Search Trigger */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              aria-label="Open search dialog"
            >
              <Search className="w-4 h-4 text-slate-500" />
            </button>

            {/* Global Search Trigger (Ctrl+K) */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 transition-colors px-3 py-1.5 rounded-lg border border-slate-200/90 text-xs text-slate-500 w-64 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              aria-label="Open search dialog (Ctrl+K)"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 font-medium">Search CRM...</span>
              </div>
              <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] text-slate-500 font-mono shadow-2xs">
                Ctrl+K
              </kbd>
            </button>

            {/* Connectivity Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/90 text-[11px] font-semibold text-slate-700 border border-slate-200">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isOnline ? 'bg-emerald-600' : 'bg-amber-600'
                )}
              />
              <span className="capitalize">{status}</span>
            </div>

            {/* User Profile Dropdown Menu */}
            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  aria-label="User account menu"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0B132B] text-white flex items-center justify-center text-xs font-bold font-mono shadow-2xs">
                    {user?.displayName
                      ? user.displayName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                      : 'SR'}
                  </div>
                </button>
              }
              items={userMenuItems}
            />
          </div>
        </header>

        {/* Main Content Workspace (Clicks outside sidebar will collapse it) */}
        <main
          onClick={handleWorkspaceClick}
          className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 print:p-0 print:m-0 print:overflow-visible"
        >
          <div className="max-w-7xl mx-auto print:max-w-none print:m-0 print:p-0">{children}</div>
        </main>
      </div>

      {/* Global Overlays: Command Palette, Notification Center & Chatbot Widget */}
      <div className="print:hidden">
        <CommandPalette onNavigate={handleNavClick} />
        <NotificationCenter />
        <ChatbotWidget />
      </div>
    </div>
  );
}
