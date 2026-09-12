import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Plus } from 'lucide-react';
import { ServiceSummaryCards } from './components/ServiceSummaryCards';
import { ServiceHeatmap } from './components/ServiceHeatmap';
import { ServiceToolbar } from './components/ServiceToolbar';
import { ServiceTable } from './components/ServiceTable';
import { ScheduleServiceModal } from './components/ScheduleServiceModal';
import { CompleteServiceModal } from './components/CompleteServiceModal';
import { QuickAssignModal } from './components/QuickAssignModal';
import {
  useServicesQuery,
  useServiceKPIsQuery,
  useServiceHeatmapQuery,
  type ServiceItem,
} from './services.api';
import type { ServiceQueryFilter } from '@crm/validation';

export const ServicesDirectory: React.FC = () => {
  // Main Query Filters
  const [filters, setFilters] = useState<Partial<ServiceQueryFilter>>({
    page: 1,
    limit: 10,
    search: '',
    status: 'ALL',
    classification: 'ALL',
    location: 'ALL',
    priority: 'ALL',
    targetDate: undefined,
    sortBy: 'serviceNumber',
    sortOrder: 'asc',
  });

  // Heatmap Controls
  const [heatmapPeriod, setHeatmapPeriod] = useState<'year' | 'month' | 'week' | 'day'>('month');

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [completeTargetService, setCompleteTargetService] = useState<ServiceItem | null>(null);
  const [assignTargetService, setAssignTargetService] = useState<ServiceItem | null>(null);

  // Queries
  const { data: servicesData, isLoading: isServicesLoading } = useServicesQuery(filters);
  const { data: kpis, isLoading: isKpisLoading } = useServiceKPIsQuery();
  const { data: heatmapData, isLoading: isHeatmapLoading } = useServiceHeatmapQuery(heatmapPeriod);

  const services = Array.isArray(servicesData?.data)
    ? servicesData.data
    : Array.isArray(servicesData)
    ? (servicesData as any)
    : [];
  const pagination = servicesData?.pagination || { page: 1, limit: 10, total: services.length, totalPages: 1 };

  const handleFilterChange = (updates: Partial<ServiceQueryFilter>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      search: '',
      status: 'ALL',
      classification: 'ALL',
      location: 'ALL',
      priority: 'ALL',
      targetDate: undefined,
      sortBy: 'serviceNumber',
      sortOrder: 'asc',
    });
  };

  const handleHeatmapDateSelect = (dateStr?: string) => {
    setFilters((prev) => ({
      ...prev,
      targetDate: dateStr,
      page: 1,
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <PageHeader
        title="Services & Maintenance"
        description="Schedule periodic filter replacements, assign technician visits, track warranty status, and inspect job cards."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Services' }]}
        actions={
          <Button
            onClick={() => setIsScheduleOpen(true)}
            size="sm"
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold shrink-0 shadow-xs"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add service
          </Button>
        }
      />

      {/* 1. Operational KPI Cards */}
      <ServiceSummaryCards kpis={kpis} services={services} isLoading={isKpisLoading && isServicesLoading} />

      {/* 2. GitHub-Style Service Heatmap */}
      <ServiceHeatmap
        data={heatmapData}
        isLoading={isHeatmapLoading}
        selectedPeriod={heatmapPeriod}
        onPeriodChange={setHeatmapPeriod}
        selectedDate={filters.targetDate}
        onSelectDate={handleHeatmapDateSelect}
      />

      {/* 3. Filter Toolbar with Status Tabs & Location/Classification Matrix */}
      <ServiceToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onOpenScheduleModal={() => setIsScheduleOpen(true)}
      />

      {/* 4. Main Service Data Table */}
      <ServiceTable
        services={services}
        isLoading={isServicesLoading}
        pagination={pagination}
        onPageChange={(page) => handleFilterChange({ page })}
        onOpenCompleteModal={(srv) => setCompleteTargetService(srv)}
        onOpenQuickAssign={(srv) => setAssignTargetService(srv)}
      />

      {/* Modals */}
      <ScheduleServiceModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        initialDate={filters.targetDate}
      />

      <CompleteServiceModal
        isOpen={Boolean(completeTargetService)}
        onClose={() => setCompleteTargetService(null)}
        service={completeTargetService}
      />

      <QuickAssignModal
        isOpen={Boolean(assignTargetService)}
        onClose={() => setAssignTargetService(null)}
        service={assignTargetService}
      />
    </div>
  );
};
