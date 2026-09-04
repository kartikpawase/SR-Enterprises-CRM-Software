import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { apiClient } from '../../lib/api-client';

const mockLogin = vi.fn();

vi.mock('../../providers/AuthBoundary', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Master Production LoginForm Component', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/auth/captcha') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              challengeId: 'test-challenge-uuid-5678',
              svg: '<svg><text>74KB9</text></svg>',
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    });
  });

  it('renders exact reference form: Welcome Admin heading, subtitle, 4 inputs, and Login button', async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    // Large heading and subtitle
    expect(screen.getByText('Welcome Admin')).toBeDefined();
    expect(screen.getByText('Please login to your account')).toBeDefined();

    // The 4 approved fields
    expect(screen.getByLabelText(/^username$/i)).toBeDefined();
    expect(screen.getByLabelText(/^password$/i)).toBeDefined();
    expect(screen.getByText(/captcha challenge/i)).toBeDefined();
    expect(screen.getByLabelText(/^enter captcha$/i)).toBeDefined();

    // Refresh icon button
    expect(screen.getByRole('button', { name: /refresh captcha/i })).toBeDefined();

    // Password visibility toggle
    expect(screen.getByRole('button', { name: /show password/i })).toBeDefined();

    // Full-width purple Login button
    expect(screen.getByRole('button', { name: /login to crm/i })).toBeDefined();

    // Confirms NO unauthorized options exist
    expect(screen.queryByText(/google/i)).toBeNull();
    expect(screen.queryByText(/facebook/i)).toBeNull();
    expect(screen.queryByText(/sign up/i)).toBeNull();
    expect(screen.queryByText(/register/i)).toBeNull();
    expect(screen.queryByText(/forgot password/i)).toBeNull();
    expect(screen.queryByText(/remember me/i)).toBeNull();
  });

  it('toggles password visibility when eye icon is clicked', async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe('text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput.type).toBe('password');
  });

  it('refreshes CAPTCHA challenge when refresh button is clicked', async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    // Wait for initial challenge fetch
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/auth/captcha');
    });

    const refreshBtn = screen.getByRole('button', { name: /refresh captcha/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  it('submits valid credentials and triggers onSuccess upon successful login', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    render(<LoginForm onSuccess={mockOnSuccess} />);

    // Wait for initial CAPTCHA challenge fetch
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/auth/captcha');
    });

    // Fill in credentials
    fireEvent.change(screen.getByLabelText(/^username$/i), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/^enter captcha$/i), { target: { value: '74KB9' } });

    // Submit form
    const form = screen.getByRole('button', { name: /login to crm/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('Admin', 'admin', 'test-challenge-uuid-5678', '74KB9');
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('displays generic error on invalid credentials and locks out after 3 failed attempts', async () => {
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: 'Invalid username, password, or captcha.',
      attemptsRemaining: 2,
    });

    render(<LoginForm onSuccess={mockOnSuccess} />);

    // Wait for initial CAPTCHA challenge fetch
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/auth/captcha');
    });

    fireEvent.change(screen.getByLabelText(/^username$/i), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrongpass' } });
    fireEvent.change(screen.getByLabelText(/^enter captcha$/i), { target: { value: '74KB9' } });

    const form = screen.getByRole('button', { name: /login to crm/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Invalid username, password, or captcha.')).toBeDefined();
    });

    // Test lockout on 3rd failure
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: 'Too many login attempts. Please try again later.',
      lockedOut: true,
    });

    fireEvent.change(screen.getByLabelText(/^enter captcha$/i), { target: { value: '74KB9' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/too many login attempts/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /login to crm/i }).hasAttribute('disabled')).toBe(true);
    });
  });
});
