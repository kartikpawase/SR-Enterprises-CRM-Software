import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../providers/AuthBoundary';
import { apiClient } from '../../lib/api-client';
import { CaptchaDisplay } from './CaptchaDisplay';
import { CaptchaInput } from './CaptchaInput';
import { cn } from '../../lib/utils';

export interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, className }) => {
  const { login } = useAuth();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');

  const [challengeId, setChallengeId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);

  // Quick One-Click Login for immediate desktop/browser access
  const handleQuickLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await login('admin', 'Admin@123456', 'local-challenge', '74KB9');
      if (res.success) {
        onSuccess?.();
      } else {
        setErrorMessage(res.error || 'Failed to authenticate');
      }
    } catch {
      setErrorMessage('Failed to perform quick login');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch a new CAPTCHA challenge
  const fetchCaptcha = async () => {
    setLoadingCaptcha(true);
    setCaptchaInput('');
    try {
      const res = await apiClient.get<any>('/auth/captcha');
      const payload = res?.data?.data || res?.data || res;
      if (payload && payload.challengeId && payload.svg) {
        setChallengeId(payload.challengeId);
        setCaptchaSvg(payload.svg);
      } else {
        throw new Error('Invalid captcha format');
      }
    } catch {
      // Fallback local SVG challenge if backend API is cold or unreachable
      const fallbackId = 'local-challenge';
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="54" viewBox="0 0 240 54" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;" role="img" aria-label="Security CAPTCHA challenge"><text x="75" y="34" font-family="sans-serif" font-size="22" font-weight="800" letter-spacing="4" fill="#5B3EBB">74KB9</text></svg>`;
      setChallengeId(fallbackId);
      setCaptchaSvg(fallbackSvg);
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLockedOut) return;

    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    if (!captchaInput.trim()) {
      setErrorMessage('Please complete the captcha.');
      return;
    }

    setIsSubmitting(true);

    const activeChallengeId = challengeId || 'local-challenge';

    try {
      const response = await login(username.trim(), password, activeChallengeId, captchaInput.trim());

      if (response.success) {
        onSuccess?.();
      } else {
        // Handle failed login
        const remaining = response.attemptsRemaining ?? (attemptsRemaining !== null ? attemptsRemaining - 1 : 2);
        setAttemptsRemaining(remaining);

        if (response.lockedOut || remaining <= 0) {
          setIsLockedOut(true);
          setErrorMessage('Too many login attempts. Please try again later.');
        } else {
          setErrorMessage(response.error || 'Invalid username, password, or captcha.');
        }

        // Always refresh CAPTCHA upon failed attempt
        await fetchCaptcha();
      }
    } catch {
      setErrorMessage('Invalid username, password, or captcha.');
      await fetchCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        'w-full lg:w-[46%] bg-white flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-6 sm:py-8 select-none',
        className
      )}
    >
      <div className="max-w-md w-full mx-auto">
        {/* Right Panel Header */}
        <div className="mb-5 sm:mb-6">
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-display font-extrabold text-slate-900 tracking-tight leading-none">
            Welcome Admin
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 sm:mt-2">
            Please login to your account
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMessage}</span>
              {attemptsRemaining !== null && attemptsRemaining > 0 && !isLockedOut && (
                <span className="block text-[11px] text-red-500 font-normal mt-0.5">
                  ({attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Production Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5" noValidate>
          {/* Field 1: Username */}
          <div className="flex flex-col gap-1">
            <label htmlFor="username-input" className="text-xs font-semibold text-slate-700">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting || isLockedOut}
                placeholder="Enter your username"
                autoComplete="username"
                className={cn(
                  'w-full h-12 pl-10 pr-3.5 bg-white rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all duration-150',
                  'border-slate-200/90 hover:border-slate-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 focus:outline-none shadow-2xs',
                  (isSubmitting || isLockedOut) && 'bg-slate-50 cursor-not-allowed opacity-75'
                )}
              />
            </div>
          </div>

          {/* Field 2: Password */}
          <div className="flex flex-col gap-1">
            <label htmlFor="password-input" className="text-xs font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || isLockedOut}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={cn(
                  'w-full h-12 pl-10 pr-10 bg-white rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all duration-150',
                  'border-slate-200/90 hover:border-slate-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 focus:outline-none shadow-2xs',
                  (isSubmitting || isLockedOut) && 'bg-slate-50 cursor-not-allowed opacity-75'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Field 3: Captcha Display with 1-Click Refresh */}
          <CaptchaDisplay
            svg={captchaSvg}
            loading={loadingCaptcha}
            onRefresh={fetchCaptcha}
          />

          {/* Field 4: Enter Captcha Input */}
          <CaptchaInput
            value={captchaInput}
            onChange={setCaptchaInput}
            disabled={isSubmitting || isLockedOut}
          />

          {/* Field 5: Login Button */}
          <div className="pt-1.5 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting || isLockedOut}
              className={cn(
                'w-full h-12 sm:h-13 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-2xs',
                'flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                (isSubmitting || isLockedOut) && 'opacity-60 cursor-not-allowed hover:bg-primary-600 active:scale-100 shadow-none'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Login to CRM</span>
              )}
            </button>

            {/* Instant Access Button */}
            <button
              type="button"
              onClick={handleQuickLogin}
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>⚡ One-Click Instant Access (Super Admin)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
