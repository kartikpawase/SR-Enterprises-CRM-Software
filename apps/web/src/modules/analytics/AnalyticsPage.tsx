import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Wrench,
  Download,
  Calendar,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  PieChart as PieChartIcon,
  Activity,
  Layers,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { MetricCard } from '../../components/ui/MetricCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatNumber } from '../../lib/formatters';
import {
  useAnalyticsOverview,
  useSalesAnalytics,
  useRevenueAnalytics,
  usePaymentAnalytics,
  useServiceAnalytics,
  useTechnicianAnalytics,
  useInquiryAnalytics,
} from './analytics.api';
import type { AnalyticsDateRangePreset, AnalyticsDateFilter } from '@crm/types';
import { API_PREFIX } from '@crm/shared';

const PRESETS: { label: string; value: AnalyticsDateRangePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7D' },
  { label: '30 Days', value: '30D' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Previous Month', value: 'previous_month' },
  { label: 'This Year', value: 'this_year' },
];

export const AnalyticsPage: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<AnalyticsDateRangePreset>('30D');
  const [isCustom, setIsCustom] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'sales' | 'services' | 'technicians' | 'inquiries'>('overview');
  const [isExporting, setIsExporting] = useState(false);

  const filter: AnalyticsDateFilter = {
    range: isCustom ? 'custom' : selectedPreset,
    startDate: isCustom && customStartDate ? customStartDate : undefined,
    endDate: isCustom && customEndDate ? customEndDate : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  const { data: overview } = useAnalyticsOverview(filter);
  const { data: revenueData } = useRevenueAnalytics(filter);
  const { data: salesData } = useSalesAnalytics(filter);
  const { data: paymentData } = usePaymentAnalytics(filter);
  const { data: serviceData } = useServiceAnalytics(filter);
  const { data: techData } = useTechnicianAnalytics(filter);
  const { data: inquiryData } = useInquiryAnalytics(filter);

  const handlePresetSelect = (preset: AnalyticsDateRangePreset) => {
    setIsCustom(false);
    setSelectedPreset(preset);
  };

  const handleExport = async (category: string) => {
    try {
      setIsExporting(true);
      const searchParams = new URLSearchParams();
      searchParams.append('range', isCustom ? 'custom' : selectedPreset);
      searchParams.append('category', category);
      searchParams.append('timezone', filter.timezone || 'Asia/Kolkata');
      if (isCustom && customStartDate) searchParams.append('startDate', customStartDate);
      if (isCustom && customEndDate) searchParams.append('endDate', customEndDate);

      const url = `${API_PREFIX}/analytics/export?${searchParams.toString()}`;
      window.open(url, '_blank');
    } finally {
      setIsExporting(false);
    }
  };

  const kpis = overview?.kpis;

  const formatDelta = (delta: number | null) => {
    if (delta === null) return 'New';
    if (delta === 0) return '0%';
    return `${delta > 0 ? '+' : ''}${delta}%`;
  };

  const inquiryFunnelSteps = [
    { stage: 'Total Inquiries', count: overview?.inquiries.totalInquiries ?? 0, conversionPercentage: 100 },
    { stage: 'Qualified Needs', count: overview?.inquiries.qualifiedInquiries ?? 0, conversionPercentage: overview?.inquiries.qualifiedConversionRate ?? 0 },
    { stage: 'Converted Customer', count: overview?.inquiries.convertedInquiries ?? 0, conversionPercentage: overview?.inquiries.conversionRate ?? 0 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Title and Export Actions */}
      <PageHeader
        title="Business Intelligence & Analytics"
        description="Operational reports, financial cashflow, technician efficiency, and inquiry conversions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Analytics & Reports' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={isExporting}
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
              </Button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 w-48 text-xs text-slate-700">
                <button
                  type="button"
                  onClick={() => handleExport('overview')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer"
                >
                  Executive Overview CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('revenue')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer"
                >
                  Revenue & Billing CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('sales')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer"
                >
                  Sales Transactions CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('services')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer"
                >
                  Service Operations CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('inquiries')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer"
                >
                  Website Inquiries CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('technicians')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer"
                >
                  Technician Workforce CSV
                </button>
              </div>
            </div>
          </div>
        }
      />

      {/* Date Filter Toolbar with Presets & Custom Boundaries */}
      <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 mr-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date Period:
              </span>
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    !isCustom && selectedPreset === preset.value
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustom(!isCustom)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isCustom
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Custom Range
              </button>
            </div>

            {isCustom && (
              <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-900 text-white text-xs px-2 py-1 rounded border border-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-900 text-white text-xs px-2 py-1 rounded border border-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            )}

            <div className="text-xs text-slate-400 text-right">
              Comparing with equivalent previous period
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Row (Billed vs Collected vs Outstanding Segregation) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 select-none">
        <MetricCard
          title="Gross Billed"
          value={formatCurrency(kpis?.grossBilled?.current ?? 0)}
          subtitle="Invoices issued"
          icon={<DollarSign className="w-5 h-5 text-blue-600" />}
          trend={{
            value: formatDelta(kpis?.grossBilled?.deltaPercentage ?? null),
            direction: kpis?.grossBilled?.trend ?? 'neutral',
            label: 'vs prior period',
          }}
        />

        <MetricCard
          title="Collected Revenue"
          value={formatCurrency(kpis?.amountCollected?.current ?? 0)}
          subtitle="Realized cashflow"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          trend={{
            value: formatDelta(kpis?.amountCollected?.deltaPercentage ?? null),
            direction: kpis?.amountCollected?.trend ?? 'neutral',
            label: 'vs prior period',
          }}
        />

        <MetricCard
          title="Outstanding Balance"
          value={formatCurrency(kpis?.outstandingAmount?.current ?? 0)}
          subtitle="Pending collection"
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          trend={{
            value: formatDelta(kpis?.outstandingAmount?.deltaPercentage ?? null),
            direction: kpis?.outstandingAmount?.trend === 'up' ? 'down' : 'up',
            label: 'vs prior period',
          }}
        />

        <MetricCard
          title="Sales Count"
          value={formatNumber(overview?.sales?.salesCount ?? 0)}
          subtitle="Machines & Spares"
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          trend={{
            value: formatDelta(overview?.sales?.comparison?.count?.deltaPercentage ?? null),
            direction: overview?.sales?.comparison?.count?.trend ?? 'neutral',
            label: 'vs prior period',
          }}
        />

        <MetricCard
          title="Completed Services"
          value={formatNumber(kpis?.servicesCompleted?.current ?? 0)}
          subtitle="Maintenance & Repairs"
          icon={<Wrench className="w-5 h-5 text-violet-600" />}
          trend={{
            value: formatDelta(kpis?.servicesCompleted?.deltaPercentage ?? null),
            direction: kpis?.servicesCompleted?.trend ?? 'neutral',
            label: 'vs prior period',
          }}
        />

        <MetricCard
          title="Conversion Rate"
          value={`${kpis?.inquiryConversionRate?.current ?? 0}%`}
          subtitle="Inquiries to Sales"
          icon={<Activity className="w-5 h-5 text-cyan-600" />}
          trend={{
            value: formatDelta(kpis?.inquiryConversionRate?.deltaPercentage ?? null),
            direction: kpis?.inquiryConversionRate?.trend ?? 'neutral',
            label: 'vs prior period',
          }}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Executive Overview', icon: Layers },
          { id: 'revenue', label: 'Revenue & Collections', icon: DollarSign },
          { id: 'sales', label: 'Sales & Inventory', icon: TrendingUp },
          { id: 'services', label: 'Services & Operations', icon: Wrench },
          { id: 'technicians', label: 'Technician Workforce', icon: Users },
          { id: 'inquiries', label: 'Website Inquiries & Leads', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Executive Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend: Billed vs Collected */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Revenue Trend: Billed vs Collected</span>
                  <div className="flex items-center gap-3 text-xs font-normal">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Billed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Collected
                    </span>
                  </div>
                </CardTitle>
                <CardDescription>Daily financial generation and cash realization</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-64 flex items-end gap-3 pt-6 pb-2 border-b border-slate-100">
                  {overview?.revenue?.revenueTrend && overview.revenue.revenueTrend.length > 0 ? (
                    overview.revenue.revenueTrend.map((point: any, index: number) => {
                      const maxVal = Math.max(...(overview?.revenue?.revenueTrend?.map((p: any) => Math.max(p.billed, p.collected)) || [1]));
                      const billedHeight = Math.max(8, Math.round((point.billed / (maxVal || 1)) * 180));
                      const collectedHeight = Math.max(8, Math.round((point.collected / (maxVal || 1)) * 180));

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-md z-10 whitespace-nowrap">
                            <span>{point.date}</span>
                            <span>Billed: {formatCurrency(point.billed)}</span>
                            <span>Collected: {formatCurrency(point.collected)}</span>
                          </div>

                          {/* Bars */}
                          <div className="w-full flex items-end justify-center gap-1 h-48">
                            <div
                              style={{ height: `${billedHeight}px` }}
                              className="w-3 bg-blue-500 rounded-t transition-all group-hover:bg-blue-600"
                            />
                            <div
                              style={{ height: `${collectedHeight}px` }}
                              className="w-3 bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-600"
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 truncate w-full text-center">
                            {point.date.slice(5)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      No revenue transactions recorded in this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inquiries & Lead Conversion Funnel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Inquiry Conversion Funnel</CardTitle>
                <CardDescription>Pipeline efficiency from website form / WhatsApp to customer sale</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {inquiryFunnelSteps.map((step, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{step.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{step.count}</span>
                        <Badge variant="neutral" className="text-[10px] font-mono">
                          {step.conversionPercentage}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, step.conversionPercentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Service Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-violet-600" />
                  Service Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview?.services?.serviceTypeDistribution?.map((cat: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-600">{cat.type.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{cat.count} jobs</span>
                      <span className="text-slate-400">({cat.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Technicians */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Field Technician Completion Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-2 font-medium">Technician</th>
                        <th className="pb-2 font-medium text-center">Assigned</th>
                        <th className="pb-2 font-medium text-center">Completed</th>
                        <th className="pb-2 font-medium text-right">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overview?.technicians?.technicianBreakdown?.map((tech: any) => (
                        <tr key={tech.technicianId} className="hover:bg-slate-50">
                          <td className="py-2.5 font-medium text-slate-900">{tech.technicianName}</td>
                          <td className="py-2.5 text-center text-slate-600">{tech.assignedJobs}</td>
                          <td className="py-2.5 text-center text-slate-600">{tech.completedJobs}</td>
                          <td className="py-2.5 text-right">
                            <Badge
                              variant={tech.completionRate >= 90 ? 'success' : tech.completionRate >= 75 ? 'primary' : 'warning'}
                              className="font-mono text-[11px]"
                            >
                              {tech.completionRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab Content 2: Revenue & Collections */}
      {activeTab === 'revenue' && revenueData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 select-none">
            <Card className="p-3 sm:p-4 bg-blue-50/50 border-blue-200">
              <div className="text-[10px] sm:text-xs text-blue-700 font-semibold uppercase truncate">Total Invoiced</div>
              <div className="text-lg sm:text-2xl font-bold text-blue-900 mt-1 truncate">{formatCurrency(revenueData.grossBilled)}</div>
              <div className="text-[11px] sm:text-xs text-blue-600 mt-1 truncate">{revenueData.totalInvoicesIssued} invoices issued</div>
            </Card>

            <Card className="p-3 sm:p-4 bg-emerald-50/50 border-emerald-200">
              <div className="text-[10px] sm:text-xs text-emerald-700 font-semibold uppercase truncate">Total Collected</div>
              <div className="text-lg sm:text-2xl font-bold text-emerald-900 mt-1 truncate">{formatCurrency(revenueData.amountCollected)}</div>
              <div className="text-[11px] sm:text-xs text-emerald-600 mt-1 truncate">{revenueData.collectionRate}% realized rate</div>
            </Card>

            <Card className="p-3 sm:p-4 bg-amber-50/50 border-amber-200">
              <div className="text-[10px] sm:text-xs text-amber-700 font-semibold uppercase truncate">Outstanding Balance</div>
              <div className="text-lg sm:text-2xl font-bold text-amber-900 mt-1 truncate">{formatCurrency(revenueData.outstandingAmount)}</div>
              <div className="text-[11px] sm:text-xs text-amber-600 mt-1 truncate">{revenueData.partiallyPaidCount} partially paid</div>
            </Card>

            <Card className="p-3 sm:p-4 bg-rose-50/50 border-rose-200">
              <div className="text-[10px] sm:text-xs text-rose-700 font-semibold uppercase truncate">Overdue Amount</div>
              <div className="text-lg sm:text-2xl font-bold text-rose-900 mt-1 truncate">{formatCurrency(revenueData.overdueAmount)}</div>
              <div className="text-[11px] sm:text-xs text-rose-600 mt-1 truncate">{revenueData.overdueInvoicesCount} invoices overdue</div>
            </Card>
          </div>

          {/* Payment Methods Distribution */}
          {paymentData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Payment Methods Distribution</CardTitle>
                <CardDescription>Breakdown of realized revenue across payment channels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {paymentData.paymentMethodDistribution?.map((method: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                      <div className="text-xs font-semibold text-slate-600 capitalize">{method.method.replace('_', ' ')}</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(method.totalAmount)}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>{method.count} transactions</span>
                        <span className="font-semibold text-slate-700">{method.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab Content 3: Sales */}
      {activeTab === 'sales' && salesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Top Performing Products & Spares</CardTitle>
                <CardDescription>Revenue ranking by item category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesData.salesByProduct?.map((prod, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{prod.productName}</div>
                        <div className="text-[11px] text-slate-500">{prod.count} units sold</div>
                      </div>
                      <div className="text-xs font-bold text-slate-900">{formatCurrency(prod.totalAmount)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Sales by Customer Segment</CardTitle>
                <CardDescription>Residential vs Commercial vs Industrial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {salesData.salesByCustomerType?.map((type, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{type.type}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(type.totalAmount)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{type.count} sales transactions</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab Content 4: Services */}
      {activeTab === 'services' && serviceData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 select-none">
            <Card className="p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">Total Service Orders</div>
              <div className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 truncate">{serviceData.totalServices}</div>
              <div className="text-[11px] sm:text-xs text-slate-500 mt-1 truncate">Scheduled in period</div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-emerald-700 font-semibold uppercase truncate">Completed Services</div>
              <div className="text-lg sm:text-2xl font-bold text-emerald-900 mt-1 truncate">{serviceData.completedServices}</div>
              <div className="text-[11px] sm:text-xs text-emerald-600 mt-1 truncate">{serviceData.completionRate}% completion rate</div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-amber-700 font-semibold uppercase truncate">Pending Execution</div>
              <div className="text-lg sm:text-2xl font-bold text-amber-900 mt-1 truncate">{serviceData.pendingServices}</div>
              <div className="text-[11px] sm:text-xs text-amber-600 mt-1 truncate">Active queue</div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-rose-700 font-semibold uppercase truncate">Overdue Services</div>
              <div className="text-lg sm:text-2xl font-bold text-rose-900 mt-1 truncate">{serviceData.overdueServices}</div>
              <div className="text-[11px] sm:text-xs text-rose-600 mt-1 truncate">Requires immediate dispatch</div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab Content 5: Technicians */}
      {activeTab === 'technicians' && techData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Technician Workforce Operations</CardTitle>
            <CardDescription>
              {techData.activeTechniciansCount} active field technicians | Average completion turnaround: {techData.workforceAverageCompletionHours} hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-3 font-medium">Technician Name</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium text-center">Assigned Jobs</th>
                    <th className="pb-3 font-medium text-center">Completed Jobs</th>
                    <th className="pb-3 font-medium text-center">Open Jobs</th>
                    <th className="pb-3 font-medium text-right">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {techData.technicianBreakdown?.map((tech) => (
                    <tr key={tech.technicianId} className="hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-900">{tech.technicianName}</td>
                      <td className="py-3 text-slate-600 font-mono">{tech.phone || 'N/A'}</td>
                      <td className="py-3 text-center text-slate-700 font-medium">{tech.assignedJobs}</td>
                      <td className="py-3 text-center text-emerald-700 font-semibold">{tech.completedJobs}</td>
                      <td className="py-3 text-center text-amber-700 font-semibold">{tech.openJobs}</td>
                      <td className="py-3 text-right">
                        <Badge
                          variant={tech.completionRate >= 90 ? 'success' : tech.completionRate >= 75 ? 'primary' : 'warning'}
                          className="font-mono text-xs"
                        >
                          {tech.completionRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Content 6: Inquiries & Leads */}
      {activeTab === 'inquiries' && inquiryData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 select-none">
            <Card className="p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">Total Inquiries</div>
              <div className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 truncate">{inquiryData.totalInquiries}</div>
              <div className="text-[11px] sm:text-xs text-slate-500 mt-1 truncate">Website & WhatsApp</div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-emerald-700 font-semibold uppercase truncate">Converted to Customers</div>
              <div className="text-lg sm:text-2xl font-bold text-emerald-900 mt-1 truncate">{inquiryData.convertedInquiries}</div>
              <div className="text-[11px] sm:text-xs text-emerald-600 mt-1 truncate">{inquiryData.conversionRate}% conversion rate</div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-blue-700 font-semibold uppercase truncate">Qualified Leads</div>
              <div className="text-lg sm:text-2xl font-bold text-blue-900 mt-1 truncate">{inquiryData.qualifiedInquiries}</div>
              <div className="text-[11px] sm:text-xs text-blue-600 mt-1 truncate">{inquiryData.qualifiedConversionRate}% qualified conversion</div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase truncate">New / Unaddressed</div>
              <div className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 truncate">{inquiryData.newInquiries}</div>
              <div className="text-[11px] sm:text-xs text-slate-500 mt-1 truncate">Awaiting verification</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inquiries by Source */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Acquisition Channels</CardTitle>
                <CardDescription>Where customer leads originate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {inquiryData.inquirySourceDistribution?.map((src, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs font-semibold text-slate-800 capitalize">{src.source.toLowerCase()}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{src.count} leads</span>
                      <Badge variant="neutral" className="text-[10px] font-mono">{src.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Inquiries by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Inquiry Types</CardTitle>
                <CardDescription>Product purchases vs repair requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {inquiryData.inquiryTypeDistribution?.map((type: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs font-semibold text-slate-800">{type.type.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{type.count} inquiries</span>
                      <Badge variant="neutral" className="text-[10px] font-mono">{type.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
