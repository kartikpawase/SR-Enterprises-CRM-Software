import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LoginBrandPanel } from './LoginBrandPanel';

describe('LoginBrandPanel Component Content & Visibility Suite', () => {
  it('renders all brand header identity elements', () => {
    render(<LoginBrandPanel />);

    expect(screen.getByText('SR ENTERPRISES')).toBeDefined();
    expect(screen.getByText('CRM')).toBeDefined();
    const logoImg = screen.getByAltText('SR Enterprises Logo');
    expect(logoImg).toBeDefined();
  });

  it('renders marketing headline and description without disappearing', () => {
    render(<LoginBrandPanel />);

    // Welcome to tag
    const welcomeTag = screen.getByText('Welcome to');
    expect(welcomeTag).toBeDefined();

    // SR Enterprises CRM heading
    const mainHeading = screen.getByRole('heading', { level: 1, name: /SR Enterprises CRM/i });
    expect(mainHeading).toBeDefined();

    // Descriptive marketing copy
    const marketingCopy = screen.getByText(/A smart CRM to manage your RO business customers/i);
    expect(marketingCopy).toBeDefined();

    // Ensure the parent container is not hidden
    const container = welcomeTag.closest('div');
    expect(container).not.toBeNull();
    expect(container?.className).not.toContain('hidden');
  });

  it('renders all four feature items in feature bar', () => {
    render(<LoginBrandPanel />);

    // Feature 1
    expect(screen.getByRole('heading', { level: 2, name: /Manage Customers/i })).toBeDefined();
    expect(screen.getByText(/All customer information in one place/i)).toBeDefined();

    // Feature 2
    expect(screen.getByRole('heading', { level: 2, name: /Track Sales/i })).toBeDefined();
    expect(screen.getByText(/Create & manage sales easily/i)).toBeDefined();

    // Feature 3
    expect(screen.getByRole('heading', { level: 2, name: /Invoices/i })).toBeDefined();
    expect(screen.getByText(/Professional invoices in seconds/i)).toBeDefined();

    // Feature 4
    expect(screen.getByRole('heading', { level: 2, name: /Services/i })).toBeDefined();
    expect(screen.getByText(/Track RO services & history/i)).toBeDefined();
  });
});
