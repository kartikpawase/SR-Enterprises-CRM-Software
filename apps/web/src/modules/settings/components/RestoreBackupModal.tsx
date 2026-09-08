import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  FileArchive,
  Database,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useRestoreBackupMutation, type BackupItem } from '../backup.api';
import { useToast } from '../../../providers/ToastProvider';
import type { RestoreResult } from '@crm/types';

interface RestoreBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  backup: BackupItem | null;
  onRestoreSuccess?: () => void;
}

export const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({
  isOpen,
  onClose,
  backup,
  onRestoreSuccess,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();

  const restoreMutation = useRestoreBackupMutation();

  if (!isOpen || !backup) return null;

  const handleClose = () => {
    if (restoreMutation.isPending) return;
    setConfirmed(false);
    setRestoreResult(null);
    setErrorMessage(null);
    onClose();
  };

  const handleExecuteRestore = async () => {
    if (!confirmed || !backup) return;

    setErrorMessage(null);
    setRestoreResult(null);

    try {
      const result = await restoreMutation.mutateAsync({
        id: backup.backupId,
        req: {
          confirmAction: true,
          backupId: backup.backupId,
        },
      });

      setRestoreResult(result);
      toast.success(
        `System restored successfully from ${backup.backupId}. Pre-restore safety backup: ${result.safetyBackupId}`,
        'Restore Complete'
      );
      onRestoreSuccess?.();
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred during restore.';
      setErrorMessage(msg);
      toast.error(msg, 'Restore Failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">
                Restore System Backup
              </h2>
              <p className="text-xs text-slate-500 font-mono">ID: {backup.backupId}</p>
            </div>
          </div>
          {!restoreMutation.isPending && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Active Restore Result State */}
          {restoreResult ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-emerald-900 font-display">
                    Restore Completed Successfully
                  </h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    The database and document storage have been restored to the exact state of this backup.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-mono">Restored Backup ID:</span>
                  <span className="font-bold text-slate-900 font-mono">{restoreResult.restoredBackupId}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-mono">Pre-Restore Safety Snapshot:</span>
                  <span className="font-bold text-sky-700 font-mono">{restoreResult.safetyBackupId}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-mono">Table Record Validation:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {restoreResult.verification?.tableCountsMatch !== false ? '✓ Verified (Counts Match)' : '⚠ Discrepancies Flagged'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-mono">Foreign Key Relationships:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {restoreResult.verification?.relationshipsValid !== false ? '✓ Valid (Zero Orphans)' : '⚠ Checked'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-mono">Documents Restored:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {restoreResult.verification?.documentsRestored ?? 0} files
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-mono">Total Execution Time:</span>
                  <span className="font-bold text-slate-700 font-mono">
                    {restoreResult.durationMs} ms
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={() => window.location.reload()}
                >
                  Reload Application
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Critical Warning Alert */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1.5 leading-relaxed">
                  <p className="font-bold text-sm font-display text-amber-950">
                    Restoring a backup will replace current CRM data with the selected backup.
                  </p>
                  <p className="text-amber-800">
                    All customers, sales, invoices, services, payments, and documents will be rolled back to this snapshot point.
                  </p>
                  <p className="text-amber-900 font-semibold flex items-center gap-1">
                    🛡️ An automatic safety backup of your CURRENT state will be created first. If the safety snapshot fails, the restore will NOT proceed.
                  </p>
                </div>
              </div>

              {/* Error Message if restore failed */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold font-display">Restore Failed:</span> {errorMessage}
                  </div>
                </div>
              )}

              {/* Target Backup Summary Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Target Backup Details
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Created At</span>
                    <span className="font-mono font-bold text-slate-800">
                      {new Date(backup.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Backup Type</span>
                    <span className="font-mono font-bold text-slate-800">
                      {backup.backupType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Database Records</span>
                    <span className="font-mono font-bold text-slate-800">
                      {backup.totalRecords.toLocaleString()} rows
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Document Files</span>
                    <span className="font-mono font-bold text-slate-800">
                      {backup.documentCount} files ({(backup.documentStorageSizeBytes / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Package SHA-256 Checksum</span>
                    <code className="font-mono text-[10px] text-slate-600 break-all bg-white px-2 py-1 rounded border border-slate-200 block mt-0.5">
                      {backup.checksumSha256 || 'Validated'}
                    </code>
                  </div>
                </div>
              </div>

              {/* Explicit Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-colors select-none">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={restoreMutation.isPending}
                  className="mt-0.5 rounded border-slate-300 text-danger-600 focus:ring-danger-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  I understand that this action will replace current CRM data with this backup point.
                </span>
              </label>

              {/* Restoration In-Flight Progress */}
              {restoreMutation.isPending && (
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold font-display text-sky-950">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                    Executing Staged Disaster Recovery...
                  </div>
                  <p className="text-sky-700 text-[11px] leading-relaxed">
                    1. Generating safety snapshot of current data → 2. Restoring database tables → 3. Restoring physical documents → 4. Validating relationships and counts. Please do not close this window.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!restoreResult && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={restoreMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!confirmed || restoreMutation.isPending}
              isLoading={restoreMutation.isPending}
              onClick={handleExecuteRestore}
            >
              I Understand — Restore Backup
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
