import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTechniciansQuery,
  useTechnicianKPIsQuery,
  useDeleteTechnicianMutation,
  type TechnicianItem,
} from './technicians.api';
import { TechnicianSummaryCards } from './components/TechnicianSummaryCards';
import { TechnicianToolbar } from './components/TechnicianToolbar';
import { TechnicianTable } from './components/TechnicianTable';
import { TechnicianModal } from './components/TechnicianModal';
import { TechnicianDetailDrawer } from './components/TechnicianDetailDrawer';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../providers/ToastProvider';
import { Trash2 } from 'lucide-react';

export const TechniciansDirectory: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Filter States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<TechnicianItem | null>(null);
  const [selectedTech, setSelectedTech] = useState<TechnicianItem | null>(null);
  const [deletingTech, setDeletingTech] = useState<TechnicianItem | null>(null);

  // Mutations
  const deleteMutation = useDeleteTechnicianMutation();

  // Queries
  const {
    data: techniciansData,
    isLoading,
    isFetching,
    refetch,
  } = useTechniciansQuery({
    page,
    limit,
    search: search.trim() || undefined,
    status: status as any,
  });

  const { data: kpis, isLoading: isKPIsLoading } = useTechnicianKPIsQuery();

  const handleStatusFilterSelect = (selectedStatus: string) => {
    setStatus(selectedStatus);
    setPage(1);
  };

  const handleEdit = (tech: TechnicianItem) => {
    setEditingTech(tech);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingTech(null);
    setIsModalOpen(true);
  };

  const handleDelete = (tech: TechnicianItem) => {
    setDeletingTech(tech);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTech) return;
    try {
      await deleteMutation.mutateAsync(deletingTech.id);
      toast.success(
        `Technician "${deletingTech.fullName}" was successfully deleted.`,
        'Technician Deleted'
      );
      setDeletingTech(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to delete technician. Please ensure there are no assigned records.';
      toast.error(msg, 'Delete Failed');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900">
            Technicians &amp; Field Workforce
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Manage field service engineers, skill sets, live job dispatch, and operational availability.
          </p>
        </div>
      </div>

      {/* KPI Workforce Cards */}
      <TechnicianSummaryCards
        kpis={kpis}
        isLoading={isKPIsLoading}
        activeFilter={status}
        onFilterSelect={handleStatusFilterSelect}
      />

      {/* Toolbar */}
      <TechnicianToolbar
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
        onCreateClick={handleCreate}
        onRefresh={() => refetch()}
        isFetching={isFetching}
      />

      {/* Table */}
      <TechnicianTable
        technicians={techniciansData?.data}
        isLoading={isLoading}
        onViewDetail={(tech) => setSelectedTech(tech)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {techniciansData?.pagination && (
        <Pagination
          currentPage={techniciansData.pagination.page}
          totalPages={techniciansData.pagination.totalPages}
          totalItems={techniciansData.pagination.total}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(newLimit: number) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      )}

      {/* Create / Edit Modal */}
      <TechnicianModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTech(null);
        }}
        technician={editingTech}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingTech)}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeletingTech(null);
          }
        }}
        title="Delete Technician?"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setDeletingTech(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handleConfirmDelete}
              isLoading={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
            >
              Delete Technician
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-1">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-slate-900">
                Are you sure you want to delete:
              </p>
              <p className="text-sm font-bold text-slate-900 bg-slate-50 p-2 rounded-btn border border-slate-200">
                {deletingTech?.fullName}{' '}
                <span className="font-mono text-xs text-slate-500 font-normal">
                  ({deletingTech?.phone})
                </span>
              </p>
              <p className="text-xs text-slate-500 pt-1">
                This action cannot be undone. Technicians with assigned active services or job cards cannot be deleted.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Detail Drawer */}
      <TechnicianDetailDrawer
        isOpen={Boolean(selectedTech)}
        onClose={() => setSelectedTech(null)}
        technician={selectedTech}
        onEdit={(tech) => {
          setSelectedTech(null);
          handleEdit(tech);
        }}
        onViewJobCard={(jcId) => navigate(`/job-cards/${jcId}`)}
      />
    </div>
  );
};
