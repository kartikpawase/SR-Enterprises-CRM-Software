import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommandPalette } from './CommandPalette';
import { useUIStore } from '../../stores/ui-store';

vi.mock('../../providers/AuthBoundary', () => ({
  useAuth: () => ({
    hasPermission: () => true,
    user: { displayName: 'Admin' },
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function renderWithClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('Phase 3 & Phase 25 — UI Design System & Global Search: CommandPalette Component', () => {
  beforeEach(() => {
    useUIStore.setState({ commandPaletteOpen: true });
  });

  it('should render search dialog with input and command items', () => {
    renderWithClient(<CommandPalette onNavigate={vi.fn()} />);

    expect(screen.getByPlaceholderText('Search modules, pages, actions...')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    expect(screen.getByText('Customer Directory')).toBeInTheDocument();
  });

  it('should filter items based on user query', async () => {
    renderWithClient(<CommandPalette onNavigate={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search modules, pages, actions...');

    await userEvent.type(input, 'Technician');

    expect(screen.getByText('Technician Roster')).toBeInTheDocument();
    expect(screen.queryByText('Customer Directory')).not.toBeInTheDocument();
  });

  it('should navigate to selected module on click', async () => {
    const handleNavigate = vi.fn();
    renderWithClient(<CommandPalette onNavigate={handleNavigate} />);

    await userEvent.click(screen.getByText('Customer Directory'));
    expect(handleNavigate).toHaveBeenCalledWith('/customers');
  });
});

