import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useJobCardsQuery,
  useJobCardKPIsQuery,
  useJobCardActionMutation,
  type JobCardItem,
} from './job-cards.api';
import { useTechniciansQuery } from '../technicians/technicians.api';
import { JobCardSummaryCards } from './components/JobCardSummaryCards';
import { JobCardToolbar } from './components/JobCardToolbar';
import { JobCardTable } from './components/JobCardTable';
import { CreateJobCardModal } from './components/CreateJobCardModal';
import { AssignTechnicianModal } from './components/AssignTechnicianModal';
import { CompleteJobCardModal } from './components/CompleteJobCardModal';
import { Pagination } from '../../components/ui/Pagination';

export const JobCardDirectory: React.FC = () => {
  const navigate = useNavigate();

  // Filters State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [priority, setPriority] = useState<string>('ALL');
  const [technicianId, setTechnicianId] = useState<string>('');

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assigningJobCard, setAssigningJobCard] = useState<JobCardItem | null>(null);
  const [completingJobCard, setCompletingJobCard] = useState<JobCardItem | null>(null);

  // Queries
  const {
    data: jobCardsData,
    isLoading,
    isFetching,
    refetch,
  } = useJobCardsQuery({
    page,
    limit,
    search: search.trim() || undefined,
    status: status as any,
    priority: priority as any,
    technicianId: technicianId || undefined,
  });

  const { data: kpis, isLoading: isKPIsLoading, refetch: refetchKPIs } = useJobCardKPIsQuery();
  const { data: techniciansData } = useTechniciansQuery({ limit: 100 });

  // Action Mutation
  const actionMutation = useJobCardActionMutation();

  const handleStatusFilterSelect = (selectedStatus: string) => {
    setStatus(selectedStatus);
    setPage(1);
  };

  const handleStartJob = async (id: string) => {
    try {
      await actionMutation.mutateAsync({ id, action: 'start' });
    } catch (err) {
      console.error('Failed to start job:', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Cards & Field Operations</h1>
          <p className="text-sm text-slate-700 mt-1">
            Dispatch, track technician execution, parts replacements, and service closures.
          </p>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <JobCardSummaryCards
        kpis={kpis}
        isLoading={isKPIsLoading}
        activeFilter={status}
        onFilterSelect={handleStatusFilterSelect}
      />

      {/* Toolbar */}
      <JobCardToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setPage(1);
        }}
        priority={priority}
        onPriorityChange={(val) => {
          setPriority(val);
          setPage(1);
        }}
        technicianId={technicianId}
        onTechnicianChange={(val) => {
          setTechnicianId(val);
          setPage(1);
        }}
        technicians={techniciansData?.data}
        onCreateClick={() => setIsCreateOpen(true)}
        onRefresh={() => {
          refetch();
          refetchKPIs();
        }}
        isFetching={isFetching}
      />

      {/* Main Table */}
      <JobCardTable
        jobCards={jobCardsData?.data}
        isLoading={isLoading}
        onViewDetail={(id) => navigate(`/job-cards/${id}`)}
        onAssignTech={(jc) => setAssigningJobCard(jc)}
        onStartJob={handleStartJob}
        onCompleteJob={(jc) => setCompletingJobCard(jc)}
      />

      {/* Pagination */}
      {jobCardsData?.pagination && (
        <Pagination
          currentPage={jobCardsData.pagination.page}
          totalPages={jobCardsData.pagination.totalPages}
          totalItems={jobCardsData.pagination.total}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(newLimit: number) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      )}

      {/* Modals */}
      <CreateJobCardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        technicians={techniciansData?.data || []}
      />

      <AssignTechnicianModal
        isOpen={Boolean(assigningJobCard)}
        onClose={() => setAssigningJobCard(null)}
        jobCard={assigningJobCard}
        technicians={techniciansData?.data || []}
      />

      <CompleteJobCardModal
        isOpen={Boolean(completingJobCard)}
        onClose={() => setCompletingJobCard(null)}
        jobCard={completingJobCard}
      />
    </div>
  );
};
