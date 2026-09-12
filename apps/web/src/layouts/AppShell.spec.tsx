import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';
import { NetworkStatusProvider } from '../providers/NetworkStatusProvider';
import { useUIStore } from '../stores/ui-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../providers/AuthBoundary', () => ({
  useAuth: () => ({
    hasPermission: () => true,
    user: {
      id: 'admin-1',
      username: 'admin',
      displayName: 'SR Admin',
      role: 'Super Admin',
    },
    logout: vi.fn(),
  }),
}));

describe('Phase 3 — UI Design System: AppShell Layout with Master GlobalSidebar', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    useUIStore.getState().expandSidebar();
  });

  const renderShell = (onNavigate = vi.fn()) =>
    render(
      <QueryClientProvider client={queryClient}>
        <NetworkStatusProvider>
          <BrowserRouter>
            <AppShell activePath="/dashboard" onNavigate={onNavigate}>
              <div data-testid="shell-child">Foundation Content</div>
            </AppShell>
          </BrowserRouter>
        </NetworkStatusProvider>
      </QueryClientProvider>
    );

  it('renders SR Enterprises branding, user profile, and child content', () => {
    renderShell();
    expect(screen.getByText('SR ENTERPRISES CRM')).toBeInTheDocument();
    expect(screen.getByTestId('shell-child')).toHaveTextContent('Foundation Content');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText(/Developed by/i)).toHaveTextContent('Developed by Kartik & Siddharth');
  });

  it('renders all 9 authoritative navigation items in the master sidebar', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: /main navigation/i });

    const expectedNavItems = [
      'Dashboard',
      'Customers',
      'Sales',
      'Invoices',
      'Services',
      'Payments',
      'Reports',
      'Tasks',
      'Settings',
    ];

    expectedNavItems.forEach((label) => {
      expect(within(nav).getByRole('button', { name: new RegExp(`^${label}$`, 'i') })).toBeInTheDocument();
    });
  });

  it('triggers onNavigate when a navigation button is clicked', async () => {
    const handleNavigate = vi.fn();
    renderShell(handleNavigate);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const customersBtn = within(nav).getByRole('button', { name: /customers/i });

    await userEvent.click(customersBtn);
    expect(handleNavigate).toHaveBeenCalledWith('/customers');
  });

  it('collapses sidebar when user clicks the main workspace outside the sidebar', async () => {
    renderShell();

    expect(useUIStore.getState().sidebarState).toBe('expanded');

    // Click on workspace outside sidebar
    const workspaceChild = screen.getByTestId('shell-child');
    await userEvent.click(workspaceChild);

    expect(useUIStore.getState().sidebarState).toBe('collapsed');
  });
});
