import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlobalFooter } from './GlobalFooter';

describe('GlobalFooter Component', () => {
  it('renders "Developed by Kartik & Siddharth" branding text', () => {
    render(<GlobalFooter />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent('Developed by Kartik & Siddharth');
  });

  it('includes semantic contentinfo role and print:hidden class', () => {
    render(<GlobalFooter />);
    const footer = screen.getByRole('contentinfo');
    expect(footer.className).toContain('print:hidden');
    expect(footer.className).toContain('mt-auto');
  });

  it('applies custom className if provided', () => {
    render(<GlobalFooter className="custom-test-class" />);
    const footer = screen.getByRole('contentinfo');
    expect(footer.className).toContain('custom-test-class');
  });
});
