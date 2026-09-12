import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { useInquiryKPIs, useInquiries, useCloseInquiry, useMarkInquirySpam } from './inquiries.api';
import { InquiryFormModal } from './components/InquiryFormModal';
import { InquiryConvertModal } from './components/InquiryConvertModal';
import { InquiryAssignModal } from './components/InquiryAssignModal';
import { InquiryStatusModal } from './components/InquiryStatusModal';
import { InquiryFollowUpModal } from './components/InquiryFollowUpModal';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthBoundary';
import type {
  Inquiry,
  InquiryQueryFilters,
} from '@crm/types';
import {
  INQUIRY_STATUSES,
  INQUIRY_SOURCES,
  INQUIRY_TYPES,
  INQUIRY_PRIORITIES,
} from '@crm/types';
import {
  Plus,
  Eye,
  UserCheck,
  MessageSquare,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Clock,
  TrendingUp,
  Phone,
  Ban,
  ShieldAlert,
  MoreVertical,
} from 'lucide-react';

export const InquiriesDirectory: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [filters, setFilters] = useState<Partial<InquiryQueryFilters>>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  const { data: kpis, isLoading: isKPIsLoading } = useInquiryKPIs();
  const { data: inquiriesData, isLoading: isListLoading } = useInquiries(filters);
  const closeMutation = useCloseInquiry();
  const spamMutation = useMarkInquirySpam();

  const canCreate = hasPermission('inquiries.create');
  const canUpdate = hasPermission('inquiries.update');
  const canConvert = hasPermission('inquiries.convert');
  const canAssign = hasPermission('inquiries.assign') || canUpdate;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev: any) => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev: any) => ({ ...prev, page }));
  };

  const handleCloseInquiry = async (inquiry: Inquiry) => {
    try {
      await closeMutation.mutateAsync({ id: inquiry.id });
      toast.success(`Inquiry ${inquiry.inquiryNumber} closed`, 'Closed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to close inquiry', 'Error');
    }
  };

  const handleMarkSpam = async (inquiry: Inquiry) => {
    try {
      await spamMutation.mutateAsync({ id: inquiry.id });
      toast.success(`Inquiry ${inquiry.inquiryNumber} marked as spam`, 'Spam Filtered');
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark spam', 'Error');
    }
  };

  // Table Columns Definition
  const columns = [
    {
      key: 'inquiryNumber',
      header: 'Reference & Lead',
      render: (inquiry: Inquiry) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => navigate(`/inquiries/${inquiry.id}`)}
              className="font-mono font-bold text-xs text-primary-600 hover:text-primary-800 hover:underline cursor-pointer text-left"
            >
              {inquiry.inquiryNumber}
            </button>
            {inquiry.isPossibleDuplicate && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Possible duplicate submission">
                <AlertTriangle className="w-3 h-3 text-amber-700" />
                <span>Duplicate?</span>
              </span>
            )}
          </div>
          <div className="font-semibold text-slate-900 text-xs">{inquiry.name}</div>
          {inquiry.city && <div className="text-[11px] text-slate-500">{inquiry.city}</div>}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Info',
      render: (inquiry: Inquiry) => (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <a
              href={`tel:${inquiry.phone}`}
              className="font-mono font-medium text-slate-800 hover:text-primary-600"
            >
              {inquiry.phone}
            </a>
          </div>
          {inquiry.email && (
            <div className="text-slate-500 text-[11px] truncate max-w-[150px]">
              {inquiry.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'interest',
      header: 'Interest / Request',
      render: (inquiry: Inquiry) => (
        <div className="space-y-1 text-xs max-w-[200px]">
          <Badge variant="neutral">
            {inquiry.inquiryType.replace(/_/g, ' ')}
          </Badge>
          {inquiry.productInterest && (
            <div className="text-slate-800 font-medium truncate" title={inquiry.productInterest}>
              {inquiry.productInterest}
            </div>
          )}
          {inquiry.serviceInterest && (
            <div className="text-slate-500 text-[11px] truncate" title={inquiry.serviceInterest}>
              {inquiry.serviceInterest}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (inquiry: Inquiry) => (
        <Badge variant={inquiry.source === 'WEBSITE' ? 'primary' : 'neutral'}>
          {inquiry.source.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (inquiry: Inquiry) => {
        return (
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
              inquiry.priority === 'URGENT'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : inquiry.priority === 'HIGH'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : inquiry.priority === 'NORMAL'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {inquiry.priority}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (inquiry: Inquiry) => {
        let badgeStatus: string = inquiry.status.toLowerCase();
        if (inquiry.status === 'FOLLOW_UP') badgeStatus = 'pending';
        else if (inquiry.status === 'CONVERTED') badgeStatus = 'active';
        else if (inquiry.status === 'QUALIFIED') badgeStatus = 'active';
        else if (inquiry.status === 'SPAM' || inquiry.status === 'CLOSED') badgeStatus = 'archived';

        return <StatusBadge status={badgeStatus as any} label={inquiry.status.replace(/_/g, ' ')} />;
      },
    },
    {
      key: 'assignment',
      header: 'Assigned Staff',
      render: (inquiry: Inquiry) => (
        <div className="text-xs">
          {inquiry.assignedUser ? (
            <span className="font-medium text-slate-900">{inquiry.assignedUser.fullName}</span>
          ) : (
            <span className="text-slate-400 italic">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Created At',
      render: (inquiry: Inquiry) => (
        <div className="text-xs text-slate-600">
          <div>
            {new Date(inquiry.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
          <div className="text-[11px] text-slate-400">
            {new Date(inquiry.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (inquiry: Inquiry) => {
        const menuItems = [
          {
            id: 'view',
            label: 'View Details',
            icon: <Eye className="w-4 h-4 text-slate-500" />,
            onClick: () => navigate(`/inquiries/${inquiry.id}`),
          },
          ...(canUpdate
            ? [
                {
                  id: 'followup',
                  label: 'Add Follow-Up Note',
                  icon: <Clock className="w-4 h-4 text-primary-600" />,
                  onClick: () => {
                    setSelectedInquiry(inquiry);
                    setIsFollowUpModalOpen(true);
                  },
                },
                {
                  id: 'status',
                  label: 'Change Status',
                  icon: <CheckCircle2 className="w-4 h-4 text-slate-600" />,
                  onClick: () => {
                    setSelectedInquiry(inquiry);
                    setIsStatusModalOpen(true);
                  },
                },
              ]
            : []),
          ...(canAssign
            ? [
                {
                  id: 'assign',
                  label: 'Assign Staff',
                  icon: <UserPlus className="w-4 h-4 text-slate-600" />,
                  onClick: () => {
                    setSelectedInquiry(inquiry);
                    setIsAssignModalOpen(true);
                  },
                },
              ]
            : []),
          ...(canConvert && inquiry.status !== 'CONVERTED'
            ? [
                {
                  id: 'convert',
                  label: 'Convert to Customer',
                  icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
                  onClick: () => {
                    setSelectedInquiry(inquiry);
                    setIsConvertModalOpen(true);
                  },
                },
              ]
            : []),
          'divider' as const,
          ...(canUpdate && inquiry.status !== 'CLOSED'
            ? [
                {
                  id: 'close',
                  label: 'Close Inquiry',
                  icon: <Ban className="w-4 h-4 text-slate-500" />,
                  onClick: () => handleCloseInquiry(inquiry),
                },
              ]
            : []),
          ...(canUpdate && inquiry.status !== 'SPAM'
            ? [
                {
                  id: 'spam',
                  label: 'Mark as Spam',
                  destructive: true,
                  icon: <ShieldAlert className="w-4 h-4 text-danger-600" />,
                  onClick: () => handleMarkSpam(inquiry),
                },
              ]
            : []),
        ];

        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(`/inquiries/${inquiry.id}`)}
              className="p-1.5 text-slate-500 hover:text-primary-600 rounded hover:bg-slate-100 transition-colors"
              title="View Detail"
            >
              <Eye className="w-4 h-4" />
            </button>
            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              }
              items={menuItems}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Website Inquiries &amp; Leads"
        description="Review inbound website inquiries, follow-up on prospects, and convert leads into active customer accounts."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inquiries' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
              onClick={() => navigate('/whatsapp')}
            >
              WhatsApp Hub
            </Button>
            {canCreate && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add Lead
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 select-none">
        <MetricCard
          title="Total Inquiries"
          value={isKPIsLoading ? '...' : String(kpis?.totalInquiries || 0)}
          icon={<Inbox className="w-5 h-5 text-slate-600" />}
          subtitle="All recorded leads"
        />

        <MetricCard
          title="New Leads"
          value={isKPIsLoading ? '...' : String(kpis?.newInquiries || 0)}
          icon={<UserPlus className="w-5 h-5 text-blue-600" />}
          subtitle="Uncontacted prospects"
        />

        <MetricCard
          title="Follow-Up Due"
          value={isKPIsLoading ? '...' : String(kpis?.followUpDue || 0)}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          subtitle="Action needed today"
        />

        <MetricCard
          title="Converted"
          value={isKPIsLoading ? '...' : String(kpis?.convertedCount || 0)}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          subtitle="Active customer accounts"
        />

        <MetricCard
          title="Conversion Rate"
          value={isKPIsLoading ? '...' : `${kpis?.conversionRate || 0}%`}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          subtitle="Lead to customer win rate"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="lg:col-span-2">
              <SearchInput
                placeholder="Search reference, name, phone, email, city..."
                value={filters.search || ''}
                onChange={handleSearchChange}
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: (e.target.value as any) || undefined, page: 1 })}
                options={[
                  { value: '', label: 'All Statuses' },
                  ...INQUIRY_STATUSES.map((s) => ({
                    value: s,
                    label: s.replace(/_/g, ' '),
                  })),
                ]}
              />
            </div>

            {/* Type Filter */}
            <div>
              <Select
                value={filters.inquiryType || ''}
                onChange={(e) => setFilters({ ...filters, inquiryType: (e.target.value as any) || undefined, page: 1 })}
                options={[
                  { value: '', label: 'All Types' },
                  ...INQUIRY_TYPES.map((t) => ({
                    value: t,
                    label: t.replace(/_/g, ' '),
                  })),
                ]}
              />
            </div>

            {/* Source Filter */}
            <div>
              <Select
                value={filters.source || ''}
                onChange={(e) => setFilters({ ...filters, source: (e.target.value as any) || undefined, page: 1 })}
                options={[
                  { value: '', label: 'All Sources' },
                  ...INQUIRY_SOURCES.map((s) => ({
                    value: s,
                    label: s.replace(/_/g, ' '),
                  })),
                ]}
              />
            </div>

            {/* Priority Filter */}
            <div>
              <Select
                value={filters.priority || ''}
                onChange={(e) => setFilters({ ...filters, priority: (e.target.value as any) || undefined, page: 1 })}
                options={[
                  { value: '', label: 'All Priorities' },
                  ...INQUIRY_PRIORITIES.map((p) => ({
                    value: p,
                    label: p,
                  })),
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inquiries Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={inquiriesData?.data || []}
            keyExtractor={(inquiry) => inquiry.id}
            isLoading={isListLoading}
            emptyTitle="No inquiries yet."
            emptyDescription="Inbound website inquiries and lead submissions will appear here automatically."
          />

          {/* Pagination */}
          {inquiriesData?.pagination && inquiriesData.pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-200">
              <Pagination
                currentPage={inquiriesData.pagination.page}
                totalPages={inquiriesData.pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <InquiryFormModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      {selectedInquiry && (
        <>
          <InquiryConvertModal
            isOpen={isConvertModalOpen}
            onClose={() => {
              setIsConvertModalOpen(false);
              setSelectedInquiry(null);
            }}
            inquiry={selectedInquiry}
          />

          <InquiryAssignModal
            isOpen={isAssignModalOpen}
            onClose={() => {
              setIsAssignModalOpen(false);
              setSelectedInquiry(null);
            }}
            inquiry={selectedInquiry}
          />

          <InquiryStatusModal
            isOpen={isStatusModalOpen}
            onClose={() => {
              setIsStatusModalOpen(false);
              setSelectedInquiry(null);
            }}
            inquiry={selectedInquiry}
          />

          <InquiryFollowUpModal
            isOpen={isFollowUpModalOpen}
            onClose={() => {
              setIsFollowUpModalOpen(false);
              setSelectedInquiry(null);
            }}
            inquiry={selectedInquiry}
          />
        </>
      )}
    </div>
  );
};
