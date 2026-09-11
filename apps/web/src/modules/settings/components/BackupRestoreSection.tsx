import React, { useState, useEffect } from 'react';
import {
  Archive,
  Clock,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Trash2,
  RotateCcw,
  Loader2,
  Calendar,
  HardDrive,
  Shield,
  Layers,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../providers/ToastProvider';
import {
  useBackupsQuery,
  useBackupScheduleQuery,
  useUpdateBackupScheduleMutation,
  useCreateBackupMutation,
  useVerifyBackupMutation,
  useDeleteBackupMutation,
  useBackupStorageEstimateQuery,
  triggerBackupDownload,
  type BackupItem,
  type BackupScheduleConfig,
} from '../backup.api';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { RestoreBackupModal } from './RestoreBackupModal';

export const BackupRestoreSection: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: backups = [], isLoading: isLoadingBackups, refetch: refetchBackups } = useBackupsQuery();
  const { data: schedule, isLoading: isLoadingSchedule } = useBackupScheduleQuery();
  const { data: estimate } = useBackupStorageEstimateQuery();

  // Mutations
  const updateScheduleMutation = useUpdateBackupScheduleMutation();
  const createBackupMutation = useCreateBackupMutation();
  const verifyMutation = useVerifyBackupMutation();
  const deleteMutation = useDeleteBackupMutation();

  // Local state for schedule form
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [retentionCount, setRetentionCount] = useState(7);

  // Local state for manual backup
  const [backupNotes, setBackupNotes] = useState('');

  // Local state for verification results: backupId -> status
  const [verificationMap, setVerificationMap] = useState<Record<string, { valid: boolean; checksum?: string; checking?: boolean }>>({});

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupItem | null>(null);

  // Delete CRM Database State
  const [deleteDbModalOpen, setDeleteDbModalOpen] = useState(false);
  const [isDeletingDb, setIsDeletingDb] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const handleDeleteCrmDatabase = async () => {
    if (deleteConfirmationText !== 'DELETE CRM') return;
    setIsDeletingDb(true);
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>('/system/delete-crm-database');
      toast.success((res as any)?.message || (res as any)?.data?.message || 'CRM Database and Storage successfully deleted.', 'Database Deleted');
      setDeleteDbModalOpen(false);
      setDeleteConfirmationText('');
      queryClient.clear();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete CRM database.');
    } finally {
      setIsDeletingDb(false);
    }
  };

  // Sync loaded schedule into form state
  useEffect(() => {
    if (schedule) {
      setScheduleEnabled(schedule.enabled);
      setFrequency(schedule.frequency);
      setScheduleTime(schedule.time || '02:00');
      setRetentionCount(schedule.retentionCount || 7);
    }
  }, [schedule]);

  // Handle Save Schedule Settings
  const handleSaveSchedule = async () => {
    try {
      await updateScheduleMutation.mutateAsync({
        enabled: scheduleEnabled,
        frequency,
        time: scheduleTime,
        retentionCount: Number(retentionCount) || 7,
      });
      toast.success('Automatic backup schedule settings saved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update schedule settings.');
    }
  };

  // Handle Create Full Backup
  const handleCreateBackup = async () => {
    try {
      const manifest = await createBackupMutation.mutateAsync({
        notes: backupNotes.trim() || undefined,
        backupType: 'MANUAL',
        includeDocuments: true,
      });
      setBackupNotes('');
      toast.success(`Full backup created successfully: ${manifest.backupId}`, 'Backup Completed');
      refetchBackups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create backup.');
    }
  };

  // Handle Verify Backup
  const handleVerifyBackup = async (backupId: string) => {
    setVerificationMap((prev) => ({
      ...prev,
      [backupId]: { valid: false, checking: true },
    }));

    try {
      const res = await verifyMutation.mutateAsync(backupId);
      setVerificationMap((prev) => ({
        ...prev,
        [backupId]: { valid: res.valid, checksum: res.checksum, checking: false },
      }));

      if (res.valid) {
        toast.success(`Backup ${backupId} verified successfully: SHA-256 matches.`, 'Integrity Valid');
      } else {
        toast.error(`Backup ${backupId} failed validation: ${res.errors.join(', ')}`, 'Integrity Corrupted');
      }
    } catch (err: any) {
      setVerificationMap((prev) => ({
        ...prev,
        [backupId]: { valid: false, checking: false },
      }));
      toast.error(err.message || 'Verification request failed.');
    }
  };

  // Handle Delete Backup
  const handleDeleteBackup = async (backup: BackupItem) => {
    if (backup.isProtected || backup.backupType === 'SAFETY') {
      toast.warning('Protected and pre-restore safety backups cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete backup ${backup.backupId}?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(backup.backupId);
      toast.success(`Backup ${backup.backupId} deleted.`);
      refetchBackups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete backup.');
    }
  };

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: AUTOMATIC BACKUP CONFIGURATION */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden select-none">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-slate-900">Automatic Backup Schedule</h2>
              <p className="text-xs text-slate-500">
                Scheduled background database and physical document snapshots executed by the backend server.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
              scheduleEnabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {scheduleEnabled ? '● ACTIVE' : '○ DISABLED'}
          </span>
        </div>

        <div className="p-6 bg-slate-50/50 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Toggle Status */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Automatic Backup
              </span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-slate-900">
                  {scheduleEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    scheduleEnabled ? 'bg-primary-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      scheduleEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Runs periodically in the background</p>
            </div>

            {/* Frequency Selector */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Frequency
              </span>
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'DAILY' | 'WEEKLY')}
                className="w-full text-xs font-mono font-bold"
                options={[
                  { value: 'DAILY', label: 'Daily' },
                  { value: 'WEEKLY', label: 'Weekly (Every 7 Days)' },
                ]}
              />
              <p className="text-[11px] text-slate-400">Execution interval</p>
            </div>

            {/* Execution Time */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Scheduled Time
              </span>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full text-xs font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400">Server local 24-hour time</p>
            </div>

            {/* Retention Count */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Retention Limit
              </span>
              <Input
                type="number"
                min="1"
                max="100"
                value={retentionCount}
                onChange={(e) => setRetentionCount(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400">Number of backups kept</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Automated Run: {schedule?.lastRunTime ? new Date(schedule.lastRunTime).toLocaleString() : 'Never'}</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              isLoading={updateScheduleMutation.isPending}
              onClick={handleSaveSchedule}
            >
              Save Backup Settings
            </Button>
          </div>
        </div>
      </div>

      {/* SECTION 2: MANUAL BACKUP CREATION */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden select-none">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-primary-600 shadow-2xs">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-slate-900">Manual Full Backup</h2>
              <p className="text-xs text-slate-500">
                Immediately snapshot all 49 relational tables, documents, invoice PDFs, receipt PDFs, and configurations.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 space-y-4">
          {/* Size & Readiness Estimate */}
          {estimate && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Database Volume</span>
                <p className="font-mono font-bold text-slate-900">{formatBytes(estimate.breakdown.databaseBytes)}</p>
                <p className="text-[11px] text-slate-400">49 Relational Schema Tables</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Storage Documents</span>
                <p className="font-mono font-bold text-slate-900">{formatBytes(estimate.breakdown.documentBytes)}</p>
                <p className="text-[11px] text-slate-400">Invoices, Receipts, Attachments</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Estimated Package Size</span>
                <p className="font-mono font-bold text-sky-700">{estimate.estimatedSizeFormatted}</p>
                <p className="text-[11px] text-emerald-600 font-semibold">✓ Ready for Snapshot</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Input
              placeholder="Optional notes for this backup snapshot (e.g. Pre-month-end closing)"
              value={backupNotes}
              onChange={(e) => setBackupNotes(e.target.value)}
              className="grow text-xs"
              disabled={createBackupMutation.isPending}
            />
            <Button
              variant="primary"
              className="shrink-0"
              leftIcon={<Archive className="w-4 h-4" />}
              isLoading={createBackupMutation.isPending}
              onClick={handleCreateBackup}
            >
              Create Full Backup
            </Button>
          </div>
        </div>
      </div>

      {/* SECTION 3: BACKUP HISTORY & DISASTER RECOVERY */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden select-none">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-slate-900">Backup History &amp; Disaster Recovery</h2>
              <p className="text-xs text-slate-500">
                Validated recovery points stored locally. Each package contains full database and document assets.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {backups.length} Available Snapshots
          </span>
        </div>

        <div className="overflow-x-auto">
          {isLoadingBackups ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              <span className="text-xs font-mono">Loading backup inventory...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Archive className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 font-display">No Backups Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No backup packages exist on local storage. Click "Create Full Backup" above to generate your first recovery point.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Records / Docs</th>
                  <th className="py-3 px-4">Integrity Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {backups.map((backup) => {
                  const verification = verificationMap[backup.backupId];

                  return (
                    <tr key={backup.backupId} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        <div>{new Date(backup.createdAt).toLocaleDateString()}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {new Date(backup.createdAt).toLocaleTimeString()}
                        </div>
                        {backup.notes && (
                          <div className="text-[10px] text-primary-600 truncate max-w-xs mt-0.5">
                            "{backup.notes}"
                          </div>
                        )}
                      </td>

                      {/* Backup Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            backup.backupType === 'SAFETY'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : backup.backupType === 'SCHEDULED'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-sky-100 text-sky-800 border border-sky-200'
                          }`}
                        >
                          {backup.backupType}
                        </span>
                        {backup.isProtected && (
                          <span className="ml-1 inline-flex items-center text-[10px] text-amber-600" title="Protected Backup">
                            <Shield className="w-3 h-3" />
                          </span>
                        )}
                      </td>

                      {/* Size */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {formatBytes(backup.totalPackageSizeBytes || backup.databaseSizeBytes)}
                      </td>

                      {/* Records & Documents */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        <div>{backup.totalRecords.toLocaleString()} rows</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {backup.documentCount} documents
                        </div>
                      </td>

                      {/* Integrity Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {verification?.checking ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 font-mono">
                            <Loader2 className="w-3 h-3 animate-spin" /> Verifying...
                          </span>
                        ) : verification ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              verification.valid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {verification.valid ? '✓ VALID' : '✗ CORRUPTED'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            COMPLETED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Download */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-slate-600 hover:text-primary-600"
                            title="Download backup archive"
                            onClick={() => triggerBackupDownload(backup.backupId, backup.filename)}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>

                          {/* Validate */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-slate-600 hover:text-emerald-600"
                            title="Verify cryptographic SHA-256 integrity"
                            disabled={verification?.checking}
                            onClick={() => handleVerifyBackup(backup.backupId)}
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                          </Button>

                          {/* Restore */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-danger-600 border-danger-200 hover:bg-danger-50 font-bold"
                            title="Restore CRM from this backup"
                            onClick={() => {
                              setSelectedBackupForRestore(backup);
                              setRestoreModalOpen(true);
                            }}
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                          </Button>

                          {/* Delete (if non-protected) */}
                          {!backup.isProtected && backup.backupType !== 'SAFETY' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-slate-400 hover:text-rose-600"
                              title="Delete backup"
                              onClick={() => handleDeleteBackup(backup)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Danger Zone: Delete CRM Database */}
      <div className="bg-rose-50/70 rounded-xl border border-rose-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Danger Zone — Delete CRM Database</span>
            </div>
            <p className="text-xs text-rose-700/90 max-w-xl">
              Permanently deletes all operational business records (customers, sales, invoices, payments, services, warranties, assets, inventory, reminders, activities) at the database level and purges all documents and files in Supabase Storage.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setDeleteDbModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold border-rose-600 shadow-xs shrink-0 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete CRM Database</span>
          </Button>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <RestoreBackupModal
        isOpen={restoreModalOpen}
        onClose={() => {
          setRestoreModalOpen(false);
          setSelectedBackupForRestore(null);
        }}
        backup={selectedBackupForRestore}
        onRestoreSuccess={() => {
          refetchBackups();
        }}
      />

      {/* Delete CRM Database Confirmation Modal */}
      {deleteDbModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete CRM Database</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you absolutely sure you want to wipe the entire database and storage?
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-4 text-xs text-rose-800 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                Warning: This action is permanent and irreversible!
              </p>
              <ul className="list-disc pl-5 space-y-1 text-rose-700">
                <li>All customer records, sales orders, invoices, and payment ledgers will be permanently deleted from PostgreSQL.</li>
                <li>All scheduled services, job cards, customer assets, warranties, and inventory items will be wiped.</li>
                <li>All documents, invoices, backups, and attachments stored in Supabase Storage will be purged.</li>
                <li>All sequence numbers will reset to 0. Super Admin account credentials will be preserved.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Type <span className="font-mono font-bold text-rose-600">DELETE CRM</span> to confirm:
              </label>
              <Input
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE CRM"
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDbModalOpen(false);
                  setDeleteConfirmationText('');
                }}
                disabled={isDeletingDb}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteCrmDatabase}
                disabled={deleteConfirmationText !== 'DELETE CRM' || isDeletingDb}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeletingDb ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting Database...
                  </span>
                ) : (
                  'Permanently Delete Database'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
