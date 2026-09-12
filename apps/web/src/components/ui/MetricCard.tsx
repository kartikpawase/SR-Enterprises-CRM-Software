import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent } from './Card';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  className?: string;
  valueClassName?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  valueClassName,
}) => {
  return (
    <Card className={cn('relative overflow-hidden border-slate-200/90 shadow-2xs', className)}>
      <CardContent className="p-3.5 sm:p-5">
        <div className="flex items-start justify-between gap-1.5">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-mono truncate">
              {title}
            </span>
            <div className={cn('text-lg sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight truncate', valueClassName)}>
              {value}
            </div>
          </div>

          {icon && (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-primary-600 shrink-0">
              {icon}
            </div>
          )}
        </div>

        {(trend || subtitle) && (
          <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 sm:gap-2 text-xs flex-wrap">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold font-mono text-[10px] sm:text-[11px]',
                  trend.direction === 'up' && 'bg-emerald-50 text-emerald-800 border border-emerald-200',
                  trend.direction === 'down' && 'bg-red-50 text-red-800 border border-red-200',
                  trend.direction === 'neutral' && 'bg-slate-100 text-slate-700 border border-slate-200'
                )}
              >
                {trend.direction === 'up' && <ArrowUpRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}
                {trend.direction === 'down' && <ArrowDownRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}
                {trend.direction === 'neutral' && <Minus className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}
                <span>{trend.value}</span>
              </span>
            )}

            {subtitle && <span className="text-slate-500 font-medium text-[11px] sm:text-xs truncate">{subtitle}</span>}
            {trend?.label && !subtitle && <span className="text-slate-500 font-medium text-[11px] sm:text-xs truncate">{trend.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
