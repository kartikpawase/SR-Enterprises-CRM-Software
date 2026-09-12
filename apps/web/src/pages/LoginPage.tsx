import React from 'react';
import { LoginBrandPanel } from '../components/auth/LoginBrandPanel';
import { LoginForm } from '../components/auth/LoginForm';

export interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#F4F6F8] flex items-center justify-center p-3 sm:p-4 lg:p-6 select-none overflow-y-auto">
      {/* Main Centered 2-Panel Auth Card with Responsive Viewport Fitting */}
      <div className="w-full max-w-[1360px] my-auto bg-white rounded-2xl shadow-elevated border border-slate-200/90 overflow-hidden flex flex-col lg:flex-row lg:max-h-[90vh]">
        {/* Left Visual Identity Panel (54% Width) */}
        <LoginBrandPanel />

        {/* Right Authentication Panel (46% Width) */}
        <LoginForm onSuccess={onLoginSuccess} />
      </div>
    </div>
  );
};
