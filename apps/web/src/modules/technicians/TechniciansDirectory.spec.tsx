import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TechniciansDirectory } from './TechniciansDirectory';
import { ToastProvider } from '../../providers/ToastProvider';

// Mock API calls
vi.mock('./technicians.api', () => ({
  useTechnicianKPIsQuery: () => ({
    data: {
      totalTechnicians: 14,
      activeTechnicians: 11,
      onLeave: 2,
      inactiveTechnicians: 1,
    },
    isLoading: false,
  }),
  useTechniciansQuery: () => ({
    data: {
      data: [
        {
          id: 'tech-1',
          fullName: 'Suresh Kumar',
          phone: '9876543210',
          email: 'suresh.k@srenterprises.com',
          status: 'ACTIVE',
          skills: ['RO Installation', 'Membrane Replacement', 'TDS Calibration'],
          address: 'Sector 14, Gurgaon',
          emergencyContact: '9811122233',
          userId: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          activeJobsCount: 3,
          completedJobsCount: 45,
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useTechnicianDetailQuery: () => ({
    data: null,
    isLoading: false,
  }),
  useCreateTechnicianMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateTechnicianMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteTechnicianMutation: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

const mockDeleteMutateAsync = vi.fn().mockResolvedValue({ success: true });

describe('TechniciansDirectory Component (Phase 7)', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <TechniciansDirectory />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders page header and Add Technician button', () => {
    renderComponent();
    expect(screen.getByText(/Technicians & Field Workforce/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Technician/i)).toBeInTheDocument();
  });

  it('renders KPI workforce cards with correct counts', () => {
    renderComponent();
    expect(screen.getByText(/Total Workforce/i)).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getAllByText(/Active & Available/i).length).toBeGreaterThan(0);
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getAllByText(/On Leave/i).length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders technician records with contact, skills, and action buttons including Delete', () => {
    renderComponent();
    expect(screen.getByText('Suresh Kumar')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('RO Installation')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // active jobs
    expect(screen.getByText('45')).toBeInTheDocument(); // completed jobs
    expect(screen.getByTitle('Edit Profile')).toBeInTheDocument();
    expect(screen.getByTitle('View Details')).toBeInTheDocument();
    expect(screen.getByTitle('Delete Technician')).toBeInTheDocument();
  });

  it('TEST 1 (Cancel Delete): opens confirmation modal on Delete click and closes on Cancel without deleting', async () => {
    const { fireEvent } = await import('@testing-library/react');
    renderComponent();

    const deleteBtn = screen.getByTitle('Delete Technician');
    fireEvent.click(deleteBtn);

    // Confirmation modal should be visible
    expect(screen.getByText('Delete Technician?')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Suresh Kumar/i).length).toBeGreaterThanOrEqual(2);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    // Modal should close without calling mutation
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it('TEST 2 & 7 (Confirm Delete): confirms deletion and calls delete mutation with technician ID', async () => {
    const { fireEvent } = await import('@testing-library/react');
    renderComponent();

    const deleteBtn = screen.getByTitle('Delete Technician');
    fireEvent.click(deleteBtn);

    const deleteBtns = screen.getAllByRole('button', { name: /Delete Technician/i });
    // The second button is the one inside the modal footer
    const confirmBtn = deleteBtns[deleteBtns.length - 1];
    fireEvent.click(confirmBtn);

    expect(mockDeleteMutateAsync).toHaveBeenCalledWith('tech-1');
  });
});
