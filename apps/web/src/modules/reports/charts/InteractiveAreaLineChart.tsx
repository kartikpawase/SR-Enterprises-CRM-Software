import React, { useState, useRef } from 'react';
import { formatCurrency, formatNumber } from '../../../lib/formatters';
import type { ChartDataPoint } from '../reports.types';

interface InteractiveAreaLineChartProps {
  data: ChartDataPoint[];
  metricMode: 'revenue' | 'sales' | 'both';
  height?: number;
  className?: string;
  isRevenueCurrency?: boolean;
  revenueLabel?: string;
  revenueUnit?: string;
  isSalesCurrency?: boolean;
  salesLabel?: string;
  salesUnit?: string;
}

export const InteractiveAreaLineChart: React.FC<InteractiveAreaLineChartProps> = ({
  data,
  metricMode,
  height = 260,
  className = '',
  isRevenueCurrency = true,
  revenueLabel = 'Revenue',
  revenueUnit = '',
  isSalesCurrency = false,
  salesLabel = 'Orders',
  salesUnit = 'units',
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
        No data available for this period.
      </div>
    );
  }

  // Calculate scales
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 10000);
  const maxSales = Math.max(...data.map((d) => d.sales), 10);

  // SVG dimensions
  const svgWidth = 700;
  const svgHeight = height;
  const paddingLeft = 55;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const stepX = plotWidth / (data.length - 1 || 1);

  // Generate points for Revenue
  const revPoints = data.map((d, i) => {
    const x = paddingLeft + i * stepX;
    const y = paddingTop + plotHeight - (d.revenue / maxRevenue) * plotHeight;
    return { x, y, data: d };
  });

  // Generate points for Sales
  const salesPoints = data.map((d, i) => {
    const x = paddingLeft + i * stepX;
    const y = paddingTop + plotHeight - (d.sales / maxSales) * plotHeight;
    return { x, y, data: d };
  });

  // Build SVG path strings with smooth curves
  const buildSmoothPath = (points: { x: number; y: number }[]) => {
    return points.reduce((acc, point, i, arr) => {
      if (i === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      const prev = arr[i - 1]!;
      const cp1x = (prev.x + (point.x - prev.x) / 2).toFixed(1);
      const cp1y = prev.y.toFixed(1);
      const cp2x = (prev.x + (point.x - prev.x) / 2).toFixed(1);
      const cp2y = point.y.toFixed(1);
      return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }, '');
  };

  const revenueLinePath = buildSmoothPath(revPoints);
  const revenueAreaPath = `${revenueLinePath} L ${(paddingLeft + (data.length - 1) * stepX).toFixed(1)} ${(paddingTop + plotHeight).toFixed(1)} L ${paddingLeft.toFixed(1)} ${(paddingTop + plotHeight).toFixed(1)} Z`;

  const salesLinePath = buildSmoothPath(salesPoints);
  const salesAreaPath = `${salesLinePath} L ${(paddingLeft + (data.length - 1) * stepX).toFixed(1)} ${(paddingTop + plotHeight).toFixed(1)} L ${paddingLeft.toFixed(1)} ${(paddingTop + plotHeight).toFixed(1)} Z`;

  // Format Y-axis grid values
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const formatRevenueAxis = (fraction: number) => {
    const val = maxRevenue * fraction;
    if (isRevenueCurrency === false) {
      return Math.round(val).toString();
    }
    if (val >= 100000) return `₹ ${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹ ${(val / 1000).toFixed(0)}k`;
    return `₹ ${val.toFixed(0)}`;
  };

  const formatSalesAxis = (fraction: number) => {
    const val = maxSales * fraction;
    if (isSalesCurrency) {
      if (val >= 100000) return `₹ ${(val / 100000).toFixed(1)}L`;
      if (val >= 1000) return `₹ ${(val / 1000).toFixed(0)}k`;
      return `₹ ${val.toFixed(0)}`;
    }
    return Math.round(val).toString();
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const relativeX = xPos - paddingLeft;
    const index = Math.max(0, Math.min(data.length - 1, Math.round(relativeX / stepX)));
    setHoverIndex(index);
  };

  const activePoint = hoverIndex !== null ? data[hoverIndex] : null;
  const activeRevPoint = hoverIndex !== null ? revPoints[hoverIndex] : null;
  const activeSalesPoint = hoverIndex !== null ? salesPoints[hoverIndex] : null;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible select-none cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          {/* Revenue Area Gradient */}
          <linearGradient id="reportsRevGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </linearGradient>

          {/* Sales Area Gradient */}
          <linearGradient id="reportsSalesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid Lines & Y Axis Labels */}
        {yTicks.map((fraction, idx) => {
          const y = paddingTop + plotHeight - fraction * plotHeight;
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth="1"
                strokeDasharray={idx === 0 ? undefined : '3,3'}
              />
              {/* Left Y Axis (Revenue) */}
              {(metricMode === 'revenue' || metricMode === 'both') && (
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="500"
                >
                  {formatRevenueAxis(fraction)}
                </text>
              )}
              {/* Right Y Axis (Sales Count) */}
              {metricMode === 'both' && (
                <text
                  x={svgWidth - paddingRight + 8}
                  y={y + 3.5}
                  textAnchor="start"
                  fill="#A78BFA"
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="500"
                >
                  {formatSalesAxis(fraction)}
                </text>
              )}
              {metricMode === 'sales' && (
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="500"
                >
                  {formatSalesAxis(fraction)}
                </text>
              )}
            </g>
          );
        })}

        {/* Revenue Area & Line */}
        {(metricMode === 'revenue' || metricMode === 'both') && (
          <>
            <path d={revenueAreaPath} fill="url(#reportsRevGradient)" />
            <path
              d={revenueLinePath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Sales Area & Line */}
        {(metricMode === 'sales' || metricMode === 'both') && (
          <>
            <path d={salesAreaPath} fill="url(#reportsSalesGradient)" />
            <path
              d={salesLinePath}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth={metricMode === 'both' ? '2' : '2.5'}
              strokeDasharray={metricMode === 'both' ? '4,3' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* X-Axis Data Point Labels */}
        {data.map((d, i) => {
          // Render only evenly distributed labels if large count
          const showLabel = data.length <= 8 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1;
          if (!showLabel) return null;
          const x = paddingLeft + i * stepX;
          const y = paddingTop + plotHeight + 18;
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="10"
              fontFamily="sans-serif"
              fontWeight="500"
            >
              {d.date.length > 5 ? d.date.slice(5) : d.date}
            </text>
          );
        })}

        {/* Active Hover Guide Line and Points */}
        {hoverIndex !== null && activeRevPoint && (
          <g>
            <line
              x1={activeRevPoint.x}
              y1={paddingTop}
              x2={activeRevPoint.x}
              y2={paddingTop + plotHeight}
              stroke="#64748B"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            {(metricMode === 'revenue' || metricMode === 'both') && (
              <circle
                cx={activeRevPoint.x}
                cy={activeRevPoint.y}
                r="4.5"
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            )}
            {(metricMode === 'sales' || metricMode === 'both') && activeSalesPoint && (
              <circle
                cx={activeSalesPoint.x}
                cy={activeSalesPoint.y}
                r="4.5"
                fill="#8B5CF6"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            )}
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoverIndex !== null && activePoint && activeRevPoint && (
        <div
          className="absolute pointer-events-none z-20 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl border border-slate-800 transition-transform duration-75"
          style={{
            left: `${(activeRevPoint.x / svgWidth) * 100}%`,
            top: `${Math.max(10, (activeRevPoint.y / svgHeight) * 100 - 25)}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold text-slate-300 text-[11px] pb-1 mb-1 border-b border-slate-800">
            {activePoint.date}
          </div>
          {(metricMode === 'revenue' || metricMode === 'both') && (
            <div className="flex items-center justify-between gap-3 text-blue-300">
              <span>{revenueLabel}:</span>
              <span className="font-bold font-mono">
                {isRevenueCurrency === false
                  ? `${formatNumber(activePoint.revenue)} ${revenueUnit || ''}`.trim()
                  : formatCurrency(activePoint.revenue)}
              </span>
            </div>
          )}
          {(metricMode === 'sales' || metricMode === 'both') && (
            <div className="flex items-center justify-between gap-3 text-purple-300">
              <span>{salesLabel}:</span>
              <span className="font-bold font-mono">
                {isSalesCurrency
                  ? formatCurrency(activePoint.sales)
                  : `${formatNumber(activePoint.sales)} ${salesUnit || 'units'}`.trim()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
