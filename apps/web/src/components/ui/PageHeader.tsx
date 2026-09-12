import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}) => {
  return (
    <div className={cn('pb-6 border-b border-slate-200/90 mb-6', className)}>
      {/* Breadcrumb Navigation */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500 font-medium overflow-x-auto no-scrollbar whitespace-nowrap py-0.5">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li key={crumb.label} className="flex items-center gap-1.5 shrink-0">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  {isLast ? (
                    <span className="font-bold text-slate-900" aria-current="page">
                      {crumb.label}
                    </span>
                  ) : crumb.onClick ? (
                    <button
                      type="button"
                      onClick={crumb.onClick}
                      className="hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Main Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">{title}</h1>
          {description && <p className="text-xs lg:text-sm text-slate-500 font-medium mt-1">{description}</p>}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
