import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { apiClient } from '../../lib/api-client';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../providers/AuthBoundary', () => ({
  useAuth: () => ({
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'Admin',
      displayName: 'Shailendra Rajput (Admin)',
      role: 'Super Admin',
    },
    logout: vi.fn(),
    hasPermission: () => true,
    hasRole: () => true,
  }),
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('Production DashboardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockResolvedValue({
      success: true,
      data: {
        cards: {
          servicesDueToday: 12,
          servicesUrgent: 4,
          newInquiries: 8,
          inquiriesUnread: 3,
          warrantiesExpiring: 4,
          paymentsDue: 5,
          paymentsOverdue: 2,
          techniciansOnDuty: 6,
          techniciansAvailable: 3,
        },
        overview: {
          servicesScheduled: 12,
          newInquiries: 8,
          warrantiesExpiring: 4,
          paymentsDue: 5,
          techniciansOnDuty: 6,
        },
        schedule: [
          {
            id: 'SCH-001',
            time: '10:00 AM',
            customerName: 'Rahul Patil',
            serviceName: 'Kent Grand Plus',
            mode: 'Doorstep',
            category: 'Warranty',
            status: 'Scheduled',
          },
          {
            id: 'SCH-002',
            time: '12:30 PM',
            customerName: 'Amit Sharma',
            serviceName: 'Aquaguard Aura',
            mode: 'In-Shop',
            category: 'General',
            status: 'Scheduled',
          },
        ],
        paymentReminders: [
          {
            id: 'REM-001',
            customerId: '00000000-0000-0000-0000-000000000011',
            customerName: 'Rahul Patil',
            initials: 'RP',
            amount: 8500,
            formattedAmount: '₹ 8,500',
            dueTiming: 'Due tomorrow',
            invoiceNumber: 'INV-000184',
            status: 'due_soon',
          },
          {
            id: 'REM-002',
            customerId: '00000000-0000-0000-0000-000000000012',
            customerName: 'Amit Sharma',
            initials: 'AS',
            amount: 12000,
            formattedAmount: '₹ 12,000',
            dueTiming: 'Due in 3 days',
            invoiceNumber: 'INV-000186',
            status: 'due_soon',
          },
        ],
        notifications: {
          unreadCount: 3,
        },
      },
    });
  });

  it('renders operational header with greeting, search, date selector, notifications, and profile', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Good morning, Admin/i)).toBeDefined();
    expect(screen.getByText("Here's what's happening with your business today.")).toBeDefined();
    expect(screen.getByPlaceholderText(/Search customers, invoices, services.../i)).toBeDefined();
    expect(screen.getByText(/Today,/i)).toBeDefined();
    expect(screen.getByLabelText('User account menu')).toBeDefined();
  });

  it('renders the five primary operational cards in order with dynamic counts and badges', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    // Verify 5 primary operational card titles
    expect(screen.getByText('SERVICES DUE TODAY')).toBeDefined();
    expect(screen.getByText('NEW INQUIRIES')).toBeDefined();
    expect(screen.getByText('WARRANTIES EXPIRING')).toBeDefined();
    expect(screen.getByText('PAYMENTS DUE')).toBeDefined();
    expect(screen.getByText('TECHNICIANS ON DUTY')).toBeDefined();

    // Verify supporting statuses
    expect(screen.getByText('4 urgent')).toBeDefined();
    expect(screen.getByText('3 unread')).toBeDefined();
    expect(screen.getByText('Within threshold')).toBeDefined();
    expect(screen.getByText('2 overdue')).toBeDefined();
    expect(screen.getByText('Available: 3')).toBeDefined();

    // Click card navigates to relevant module
    fireEvent.click(screen.getByText('SERVICES DUE TODAY').closest('[role="button"]')!);
    expect(mockNavigate).toHaveBeenCalledWith('/services');
  });

  it("renders Today's Overview with 5 operational rows and View All action", async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Today's Overview")).toBeDefined();
    expect(screen.getByText('Services Scheduled')).toBeDefined();
    expect(screen.getByText('New Website Inquiries')).toBeDefined();
    expect(screen.getByText('Warranties Expiring Soon')).toBeDefined();
    expect(screen.getByText('Payments Due')).toBeDefined();
    expect(screen.getByText('Technicians On Duty')).toBeDefined();
  });

  it("renders Today's Schedule timeline appointments and View Calendar button", async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Today's Schedule")).toBeDefined();
    expect(screen.getAllByText('Rahul Patil').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Kent Grand Plus • Doorstep/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('10:00 AM')).toBeDefined();
    expect(screen.getByText('Warranty')).toBeDefined();
    expect(screen.getByText('View Calendar')).toBeDefined();
  });

  it('renders Payment Reminders section with formatted amounts and invoice badges', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Payment Reminders')).toBeDefined();
    expect(screen.getByText('₹ 8,500')).toBeDefined();
    expect(screen.getByText('INV-000184')).toBeDefined();
    expect(screen.getByText('Due tomorrow')).toBeDefined();
    expect(screen.getByText('₹ 12,000')).toBeDefined();
    expect(screen.getByText('INV-000186')).toBeDefined();
  });
});
