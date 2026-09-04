import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('Phase 3 — UI Design System: StatusBadge Component', () => {
  it('should render correct label for status', () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should apply semantic success color for ACTIVE status', () => {
    const { container } = render(<StatusBadge status="ACTIVE" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-emerald-50');
  });

  it('should apply semantic warning color for PENDING status', () => {
    const { container } = render(<StatusBadge status="PENDING" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-amber-50');
  });

  it('should apply semantic danger color for CANCELLED status', () => {
    const { container } = render(<StatusBadge status="CANCELLED" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-red-50');
  });
});
