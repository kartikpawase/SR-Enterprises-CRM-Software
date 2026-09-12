import React from 'react';
import { LoginBrandPanel } from '../components/auth/LoginBrandPanel';
import { LoginForm } from '../components/auth/LoginForm';
import { GlobalFooter } from '../components/navigation/GlobalFooter';

export interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#F4F6F8] flex flex-col justify-between p-3 sm:p-4 lg:p-6 select-none overflow-y-auto">
      {/* Main Centered 2-Panel Auth Card with Responsive Viewport Fitting */}
      <div className="w-full max-w-[1360px] mx-auto my-auto bg-white rounded-2xl shadow-elevated border border-slate-200/90 overflow-hidden flex flex-col lg:flex-row lg:max-h-[90vh]">
        {/* Left Visual Identity Panel (54% Width) */}
        <LoginBrandPanel />

        {/* Right Authentication Panel (46% Width) */}
        <LoginForm onSuccess={onLoginSuccess} />
      </div>

      <GlobalFooter className="pt-4 pb-2" />
    </div>
  );
};

