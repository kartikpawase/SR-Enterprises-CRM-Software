import React from 'react';

export interface LoadingScreenProps {
  progress?: number;
  message?: string;
  subMessage?: string;
  isFadingOut?: boolean;
}

/**
 * SR Enterprises CRM - Code-Based Application Loading Screen Component
 *
 * Reproduces the approved visual design using:
 * - Clean transparent CRM logo PNG
 * - CSS midnight-navy radial gradient background
 * - Real desktop horizontal progress bar
 * - Real mobile circular SVG spinner
 * - Responsive typography and layout
 * - Developer branding footer ("Developed by Kartik & Siddharth")
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress = 25,
  message = 'Loading your CRM...',
  subMessage = 'Building better business relationships',
  isFadingOut = false,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      id="crm-splash-screen"
      role="status"
      aria-live="polite"
      aria-label="Loading SR Enterprises CRM"
      className={`fixed inset-0 w-screen h-screen z-[9999999] flex flex-col items-center justify-center overflow-hidden m-0 p-6 box-border select-none transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFadingOut ? 'opacity-0 invisible pointer-events-none' : 'opacity-100 visible pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#00091b',
        background: 'radial-gradient(ellipse at 50% 38%, #0a254a 0%, #031429 55%, #000818 100%)',
      }}
    >
      <div className="flex flex-col items-center justify-center text-center max-w-[480px] w-full -mt-8">
        {/* Approved Transparent CRM Logo PNG */}
        <div className="mb-5 flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <img
            id="crm-splash-logo"
            src="/crm-logo.png"
            alt="SR Enterprises CRM"
            className="w-[175px] md:w-[215px] max-w-[65vw] max-h-[230px] md:max-h-[285px] object-contain block"
            width="220"
            height="292"
            loading="eager"
            decoding="sync"
          />
        </div>

        {/* Tagline */}
        <div className="font-['Plus_Jakarta_Sans',sans-serif] text-xs md:text-sm font-medium tracking-[0.08em] text-slate-200/85 mb-6 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
          Manage &middot; Grow &middot; Succeed Together
        </div>

        {/* Desktop Horizontal Progress Bar */}
        <div
          className="hidden md:block w-[280px] max-w-[80vw] h-[5px] bg-[#162a45] rounded-full overflow-hidden relative mb-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_12px_rgba(10,37,74,0.3)]"
          aria-hidden="true"
        >
          <div
            id="crm-splash-progress"
            className="h-full bg-gradient-to-r from-red-600 via-red-500 to-rose-400 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)] transition-[width] duration-350 ease-out relative overflow-hidden"
            style={{ width: `${clampedProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_1.8s_infinite]" />
          </div>
        </div>

        {/* Mobile Circular SVG Spinner */}
        <div
          className="block md:hidden w-[38px] height-[38px] mb-4"
          aria-hidden="true"
        >
          <svg className="w-[38px] h-[38px] animate-spin" viewBox="0 0 44 44">
            <circle
              className="stroke-[#162a45]"
              cx="22"
              cy="22"
              r="18"
              fill="none"
              strokeWidth="3.5"
            />
            <circle
              className="stroke-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]"
              cx="22"
              cy="22"
              r="18"
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="80"
              strokeDashoffset="60"
            />
          </svg>
        </div>

        {/* Loading Text Elements */}
        <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[13px] font-semibold tracking-[0.12em] uppercase text-white/90 mb-1.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
          {message}
        </div>
        <div className="font-['Inter',sans-serif] text-xs font-normal tracking-[0.04em] text-slate-400/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
          {subMessage}
        </div>
      </div>

      {/* Developer Branding Footer */}
      <div className="absolute bottom-[max(20px,env(safe-area-inset-bottom,20px))] left-0 right-0 text-center font-['Plus_Jakarta_Sans',sans-serif] text-[13px] font-medium tracking-[0.05em] text-white/65 drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)] pointer-events-none z-10">
        Developed by Kartik &amp; Siddharth
      </div>
    </div>
  );
};

export default LoadingScreen;
