import React from 'react';
import { cn } from '../../lib/utils';

export interface GlobalFooterProps {
  className?: string;
}

export const GlobalFooter: React.FC<GlobalFooterProps> = ({ className }) => {
  return (
    <footer
      role="contentinfo"
      className={cn(
        'w-full max-w-7xl mx-auto mt-auto pt-6 sm:pt-8 print:hidden select-none',
        className
      )}
    >
      <div className="pt-3 sm:pt-4 border-t border-slate-200/80 flex flex-col items-center justify-center gap-1.5">
        <div className="w-5 h-0.5 rounded-full bg-red-600/80 mb-0.5" aria-hidden="true" />
        <p className="text-[11px] sm:text-xs font-medium text-slate-500 tracking-wide text-center">
          Developed by <span className="text-slate-700 font-semibold">Kartik &amp; Siddharth</span>
        </p>
      </div>
    </footer>
  );
};
