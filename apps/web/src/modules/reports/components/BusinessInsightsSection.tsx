import React from 'react';
import { Sparkles, TrendingUp, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../../lib/formatters';
import type { BusinessInsightItem } from '../reports.types';
import type { AnalyticsOverview } from '@crm/types';

interface BusinessInsightsSectionProps {
  overview?: AnalyticsOverview;
  insights?: BusinessInsightItem[];
  onActionClick?: (category: string) => void;
}

export const BusinessInsightsSection: React.FC<BusinessInsightsSectionProps> = ({
  overview,
  insights,
  onActionClick,
}) => {
  // Dynamically derive smart business insights from real database metrics
  const generatedInsights: BusinessInsightItem[] = React.useMemo(() => {
    if (insights && insights.length > 0) return insights;

    const items: BusinessInsightItem[] = [];

    // 1. Revenue Insight
    const grossBilled = overview?.revenue?.grossBilled ?? 0;
    const billedDelta = overview?.kpis?.grossBilled?.deltaPercentage ?? 0;
    const topProduct = overview?.sales?.salesByProduct?.[0];

    items.push({
      id: 'ins-revenue',
      title: grossBilled > 0 ? (billedDelta >= 0 ? 'Revenue Trajectory' : 'Revenue Performance') : 'Revenue Baseline',
      message: grossBilled > 0
        ? `Total billed revenue reached ${formatCurrency(grossBilled)}${topProduct ? `, led by ${topProduct.productName} (${topProduct.count} units)` : ''}.`
        : 'No billing invoices recorded in this period. Realized sales will reflect here automatically.',
      metric: formatCurrency(grossBilled),
      delta: billedDelta !== 0 ? `${billedDelta >= 0 ? '+' : ''}${billedDelta}%` : undefined,
      type: billedDelta >= 0 ? 'positive' : 'warning',
      category: 'revenue',
    });

    // 2. Field Service SLA Insight
    const totalServices = overview?.services?.totalServices ?? 0;
    const completedServices = overview?.services?.completedServices ?? 0;
    const completionRate = overview?.services?.completionRate ?? (totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 100);

    items.push({
      id: 'ins-service',
      title: totalServices > 0 ? 'Field Service SLA' : 'Service Operations',
      message: totalServices > 0
        ? `${completedServices} of ${totalServices} service requests completed (${completionRate}% SLA efficiency).`
        : 'All service tickets are up to date with zero pending customer complaints.',
      metric: `${completionRate}% SLA`,
      delta: overview?.kpis?.servicesCompleted?.deltaPercentage !== undefined ? `${overview.kpis.servicesCompleted.deltaPercentage >= 0 ? '+' : ''}${overview.kpis.servicesCompleted.deltaPercentage}%` : undefined,
      type: completionRate >= 80 ? 'positive' : 'warning',
      category: 'service',
    });

    // 3. Customer & Maintenance Insight
    const totalCust = overview?.customers?.totalCustomers ?? 0;
    const newCust = overview?.customers?.newCustomers ?? 0;
    const activeWarranties = overview?.warranties?.activeWarranties ?? 0;

    items.push({
      id: 'ins-customers',
      title: 'Customer Expansion',
      message: totalCust > 0
        ? `${totalCust} registered customer accounts (${newCust} added this period) with ${activeWarranties} units under active warranty.`
        : 'Customer directory is ready. Import or register customers to track lifetime asset history.',
      metric: `${formatNumber(totalCust)} Accounts`,
      delta: newCust > 0 ? `+${newCust} New` : undefined,
      type: 'positive',
      category: 'maintenance',
    });

    // 4. Cashflow & Collections Insight
    const outstanding = overview?.revenue?.outstandingAmount ?? 0;
    const collected = overview?.revenue?.amountCollected ?? 0;
    const overdueCount = overview?.revenue?.overdueInvoicesCount ?? 0;

    items.push({
      id: 'ins-collection',
      title: outstanding > 0 ? 'Payment Collection Status' : 'Cashflow Realization',
      message: outstanding > 0
        ? `${formatCurrency(outstanding)} pending collection across outstanding invoices (${overdueCount} overdue).`
        : `All generated customer invoices are fully settled. Realized collected cash: ${formatCurrency(collected)}.`,
      metric: `${formatCurrency(outstanding)} Pending`,
      delta: overview?.kpis?.outstandingAmount?.deltaPercentage ? `${overview.kpis.outstandingAmount.deltaPercentage}%` : undefined,
      type: outstanding === 0 ? 'positive' : overdueCount > 0 ? 'warning' : 'info',
      category: 'collection',
    });

    return items;
  }, [overview, insights]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">Business Insights</h2>
            <p className="text-xs text-slate-500">Real-time operational signals and system intelligence</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-mono">
          LIVE SIGNALS
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 select-none">
        {generatedInsights.map((insight) => {
          const isPositive = insight.type === 'positive';
          const isWarning = insight.type === 'warning';

          return (
            <div
              key={insight.id}
              className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isPositive
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : isWarning
                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </div>
                  {insight.delta && (
                    <span
                      className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                        isPositive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }`}
                    >
                      {insight.delta}
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-bold text-slate-900 mb-1 font-display">{insight.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{insight.message}</p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 font-mono">{insight.metric}</span>
                <button
                  type="button"
                  onClick={() => onActionClick?.(insight.category)}
                  className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 cursor-pointer font-sans"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
