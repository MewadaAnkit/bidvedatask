import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusHistoryItem } from '../types';
import { AuditTrailTimeline } from '../components/AuditTrailTimeline';
import {
  Search,
  ArrowRight,
  RefreshCw,
  LayoutList,
  Clock,
  Store,
  Building2,
} from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'TIMELINE' | 'TABLE'>('TIMELINE');

  const { data: logsRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminFullAuditLogs', search, selectedEntity],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedEntity !== 'ALL') params.append('entityType', selectedEntity);
      params.append('limit', '50');
      return api.get<{ data: StatusHistoryItem[] }>(`/api/admin/audit-logs?${params.toString()}`);
    },
  });

  const logs = logsRes?.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
      case 'ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SHORTLISTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CLOSED':
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'AWARDED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DRAFT':
      case 'SUBMITTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident record of state transitions, quote submissions, buyer evaluations, and system actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setViewMode('TIMELINE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'TIMELINE'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Table
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {viewMode === 'TIMELINE' ? (
        <AuditTrailTimeline
          items={logs}
          title="Activity Timeline"
          subtitle="Chronological feed of procurement decisions, vendor quotes, and RFQ lifecycle events."
        />
      ) : (
        <>
          {/* Filters for Table View */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reason, actor, or vendor..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto">
              {[
                { id: 'ALL', label: 'All Events' },
                { id: 'RFQ', label: 'RFQs' },
                { id: 'QUOTE', label: 'Quotes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedEntity(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedEntity === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No audit logs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Entity & Target</th>
                      <th className="py-3 px-4">Status Transition</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4">Changed By</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800 font-mono">{log.entityType}</span>
                            <span className="text-[10px] text-slate-400 font-mono">#{log.entityId.slice(0, 8)}</span>
                          </div>
                          {log.targetQuote && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700">
                              <Store className="w-3 h-3" />
                              <span className="font-semibold">{log.targetQuote.vendorName}</span>
                              {log.targetQuote.totalAmount != null && (
                                <span className="text-slate-500">
                                  (₹{Number(log.targetQuote.totalAmount).toLocaleString('en-IN')})
                                </span>
                              )}
                            </div>
                          )}
                          {log.targetRfq && (
                            <div className="mt-0.5 text-[11px] text-slate-500 truncate max-w-xs">
                              RFQ: {log.targetRfq.title}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                            <span className={`px-2 py-0.5 rounded border ${getStatusBadge(log.fromStatus)}`}>
                              {log.fromStatus}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className={`px-2 py-0.5 rounded border font-semibold ${getStatusBadge(log.toStatus)}`}>
                              {log.toStatus}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-xs">
                          {log.reason || '—'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{log.changedBy?.name || 'System'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {log.changedBy?.email || 'automated'} ({log.changedBy?.role || 'SYSTEM'})
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right text-slate-500 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
