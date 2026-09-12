import React from 'react';
import { History, RefreshCw, Shield, AlertCircle, FileCode } from 'lucide-react';
import { useSettingsAuditLogsQuery } from '../settings.api';

export const SettingsAuditLogSection: React.FC = () => {
  const { data: logs, isLoading, error, refetch, isFetching } = useSettingsAuditLogsQuery();

  if (isLoading) {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-40 bg-slate-100 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-xl border border-red-200 text-red-700 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">Failed to load audit logs: {(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shadow-2xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">Configuration Audit Trail</h2>
            <p className="text-xs text-slate-500">Immutable ledger recording administrator setting alterations, timestamps, and previous state.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh Trail
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Administrator</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Updated Snapshot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                  No configuration audit records logged yet.
                </td>
              </tr>
            )}
            {logs &&
              logs.map((log) => {
                const dateStr = new Date(log.timestamp).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dateStr}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800 font-mono">
                        {log.actorUsername || 'System Administrator'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-sky-50 text-sky-700 border border-sky-200/80">
                        {log.entityId}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-md truncate font-mono text-[11px] text-slate-500">
                      {log.afterState ? (
                        <span className="truncate block" title={JSON.stringify(log.afterState)}>
                          {JSON.stringify(log.afterState)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <Shield className="w-3.5 h-3.5 text-slate-400" /> Tamper-evident PostgreSQL audit trail
        </span>
        <span className="font-mono">Showing latest {logs?.length || 0} entries</span>
      </div>
    </div>
  );
};
