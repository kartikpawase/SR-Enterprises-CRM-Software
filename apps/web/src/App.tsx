import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { NetworkStatusProvider } from './providers/NetworkStatusProvider';
import { AuthProvider, useAuth } from './providers/AuthBoundary';
import { ToastProvider } from './providers/ToastProvider';
import { AppShell } from './layouts/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PageHeader } from './components/ui/PageHeader';
import { Card, CardContent } from './components/ui/Card';
import { StatusBadge } from './components/ui/StatusBadge';
import { LoadingState } from './components/ui/LoadingState';
import { Button } from './components/ui/Button';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { CustomerDirectory } from './modules/customers/CustomerDirectory';
import { CustomerProfile } from './modules/customers/CustomerProfile';
import { SalesDirectory } from './modules/sales/SalesDirectory';
import { SaleCreatePage } from './modules/sales/SaleCreatePage';
import { SaleDetailPage } from './modules/sales/SaleDetailPage';
import { RentalsPage } from './modules/rentals/RentalsPage';
import { InvoiceDirectory } from './modules/invoices/InvoiceDirectory';
import { InvoiceDetailPage } from './modules/invoices/InvoiceDetailPage';
import { AssetsDirectory } from './modules/assets/AssetsDirectory';
import { ServicesDirectory } from './modules/services/ServicesDirectory';
import { ServiceDetailPage } from './modules/services/ServiceDetailPage';
import { WarrantyDirectory } from './modules/warranties/WarrantyDirectory';
import { JobCardDirectory } from './modules/job-cards/JobCardDirectory';
import { JobCardDetailPage } from './modules/job-cards/JobCardDetailPage';
import { TechniciansDirectory } from './modules/technicians/TechniciansDirectory';
import { PaymentsDirectory } from './modules/payments/PaymentsDirectory';
import { RemindersDirectory } from './modules/reminders/RemindersDirectory';
import { InquiriesDirectory } from './modules/inquiries/InquiriesDirectory';
import { InquiryDetailPage } from './modules/inquiries/InquiryDetailPage';
import { WhatsAppHub } from './modules/whatsapp/WhatsAppHub';
import { AnalyticsPage } from './modules/analytics/AnalyticsPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { NotificationsPage } from './modules/notifications/NotificationsPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { DuesPage } from './modules/dues/DuesPage';
import { InventoryPage } from './modules/inventory/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import {
  TrendingUp,
  Plus,
  Lock,
  Loader2,
} from 'lucide-react';

/**
 * Permission Guard wrapper for module views
 */
export const PermissionGuard: React.FC<{
  permission?: string;
  moduleName: string;
  children: React.ReactNode;
}> = ({ permission, moduleName, children }) => {
  const { hasPermission } = useAuth();

  if (permission && !hasPermission(permission)) {
    return (
      <div className="p-8 text-center bg-white rounded-card border border-slate-200">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">Access Restricted</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          You do not have the required permission (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{permission}</code>) to access the {moduleName} module.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

// Reusable Module Shell View Placeholder
function ModulePlaceholderView({
  title,
  description,
  permission,
}: {
  title: string;
  description: string;
  permission?: string;
}) {
  return (
    <PermissionGuard permission={permission} moduleName={title}>
      <div className="space-y-6 animate-in fade-in duration-fast">
        <PageHeader
          title={title}
          description={description}
          breadcrumbs={[{ label: 'Home' }, { label: title }]}
          actions={
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Add New
            </Button>
          }
        />

        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">{title} Module Foundation</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-4">
              The application shell, navigation routing, and design system components are active. Complete
              business domain flows will be enabled in subsequent development phases.
            </p>
            <StatusBadge status="active" label="Ready for Module Implementation" />
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white select-none">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm font-medium text-slate-400">Verifying session security...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function LoginRoute() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <LoginPage
      onLoginSuccess={async () => {
        await checkAuth();
        navigate(from, { replace: true });
      }}
    />
  );
}

function MainAppShellRouter() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ProtectedRoute>
      <AppShell activePath={location.pathname} onNavigate={(path) => navigate(path)}>
        <Suspense fallback={<LoadingState message="Loading module..." />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Date-Wise Dues & Scheduled Activities */}
            <Route
              path="/dues"
              element={
                <PermissionGuard moduleName="Dues">
                  <DuesPage />
                </PermissionGuard>
              }
            />

          {/* Customer Domain Routes */}
          <Route
            path="/customers"
            element={
              <PermissionGuard permission="customers.view" moduleName="Customers">
                <CustomerDirectory />
              </PermissionGuard>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <PermissionGuard permission="customers.view" moduleName="Customer Profile">
                <CustomerProfile />
              </PermissionGuard>
            }
          />

          {/* Sales Domain Routes (Phase 5 Live) */}
          <Route
            path="/sales"
            element={
              <PermissionGuard permission="sales.view" moduleName="Sales">
                <SalesDirectory />
              </PermissionGuard>
            }
          />
          <Route
            path="/sales/new"
            element={
              <PermissionGuard permission="sales.create" moduleName="New Sale">
                <SaleCreatePage />
              </PermissionGuard>
            }
          />
          <Route
            path="/sales/:id"
            element={
              <PermissionGuard permission="sales.view" moduleName="Sale Details">
                <SaleDetailPage />
              </PermissionGuard>
            }
          />

          {/* Rent & Machine Subscription Management */}
          <Route
            path="/rent"
            element={
              <PermissionGuard permission="rentals.view" moduleName="Rental Management">
                <RentalsPage />
              </PermissionGuard>
            }
          />

          {/* Invoices Domain Routes (Phase 5 Live) */}
          <Route
            path="/invoices"
            element={
              <PermissionGuard permission="invoices.view" moduleName="Invoices">
                <InvoiceDirectory />
              </PermissionGuard>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <PermissionGuard permission="invoices.view" moduleName="Invoice Details">
                <InvoiceDetailPage />
              </PermissionGuard>
            }
          />
          <Route path="/invoice" element={<Navigate to="/invoices" replace />} />
          <Route
            path="/invoice/:id"
            element={
              <PermissionGuard permission="invoices.view" moduleName="Invoice Details">
                <InvoiceDetailPage />
              </PermissionGuard>
            }
          />

          {/* Customer Assets Domain Routes (Phase 5 Live) */}
          <Route
            path="/assets"
            element={
              <PermissionGuard permission="assets.view" moduleName="Customer Assets">
                <AssetsDirectory />
              </PermissionGuard>
            }
          />

          {/* Services & Maintenance Domain Routes (Page 6 Live) */}
          <Route
            path="/services"
            element={
              <PermissionGuard permission="services.view" moduleName="Services & Maintenance">
                <ServicesDirectory />
              </PermissionGuard>
            }
          />
          <Route
            path="/services/:id"
            element={
              <PermissionGuard permission="services.view" moduleName="Service Details">
                <ServiceDetailPage />
              </PermissionGuard>
            }
          />
          {/* Inventory & Spare Parts Management */}
          <Route
            path="/inventory"
            element={
              <PermissionGuard moduleName="Inventory">
                <InventoryPage />
              </PermissionGuard>
            }
          />
          {/* Payments & Collections (Phase 8 Live) */}
          <Route
            path="/payments"
            element={
              <PermissionGuard permission="payments.view" moduleName="Payments & Collections">
                <PaymentsDirectory />
              </PermissionGuard>
            }
          />
          {/* Reminders & Follow-ups (Phase 8 Live) */}
          <Route
            path="/reminders"
            element={
              <PermissionGuard permission="tasks.view" moduleName="Follow-up Reminders">
                <RemindersDirectory />
              </PermissionGuard>
            }
          />
          <Route
            path="/reports"
            element={
              <PermissionGuard permission="reports.view" moduleName="Reports & Analytics">
                <ReportsPage />
              </PermissionGuard>
            }
          />
          {/* Job Cards & Field Operations (Phase 7 Live) */}
          <Route
            path="/job-cards"
            element={
              <PermissionGuard permission="services.view" moduleName="Job Cards">
                <JobCardDirectory />
              </PermissionGuard>
            }
          />
          <Route
            path="/job-cards/:id"
            element={
              <PermissionGuard permission="services.view" moduleName="Job Card Details">
                <JobCardDetailPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/tasks"
            element={
              <PermissionGuard permission="services.view" moduleName="Field Tasks & Job Cards">
                <JobCardDirectory />
              </PermissionGuard>
            }
          />
          <Route
            path="/inquiries"
            element={
              <PermissionGuard permission="inquiries.view" moduleName="Website Inquiries & Leads">
                <InquiriesDirectory />
              </PermissionGuard>
            }
          />
          <Route
            path="/inquiries/:id"
            element={
              <PermissionGuard permission="inquiries.view" moduleName="Inquiry Detail">
                <InquiryDetailPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/whatsapp"
            element={
              <PermissionGuard permission="whatsapp.view" moduleName="WhatsApp Business Hub">
                <WhatsAppHub />
              </PermissionGuard>
            }
          />
          {/* Business Analytics & Intelligence (Phase 10 Live) */}
          <Route
            path="/analytics"
            element={
              <PermissionGuard permission="reports.view" moduleName="Business Analytics">
                <AnalyticsPage />
              </PermissionGuard>
            }
          />
          {/* Warranty & AMC Domain Routes (Phase 6 Live) */}
          <Route
            path="/warranty"
            element={
              <PermissionGuard permission="assets.view" moduleName="Warranty Management">
                <WarrantyDirectory />
              </PermissionGuard>
            }
          />
          <Route
            path="/warranties"
            element={
              <PermissionGuard permission="assets.view" moduleName="Warranty Management">
                <WarrantyDirectory />
              </PermissionGuard>
            }
          />
          {/* Technicians & Field Workforce Domain Routes (Phase 7 Live) */}
          <Route
            path="/technicians"
            element={
              <PermissionGuard permission="services.view" moduleName="Technicians Roster">
                <TechniciansDirectory />
              </PermissionGuard>
            }
          />
          {/* Notifications Center (Phase 10 Live) */}
          <Route
            path="/notifications"
            element={
              <PermissionGuard moduleName="Notifications Center">
                <NotificationsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <PermissionGuard moduleName="System Settings" permission="settings.manage">
                <SettingsPage />
              </PermissionGuard>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/*" element={<MainAppShellRouter />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NetworkStatusProvider>
          <AuthProvider>
            <ErrorBoundary>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </ErrorBoundary>
          </AuthProvider>
        </NetworkStatusProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
