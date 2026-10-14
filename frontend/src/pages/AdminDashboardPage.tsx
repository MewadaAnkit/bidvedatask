import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { PlatformStats, StatusHistoryItem } from '../types';
import {
  Users,
  Layers,
  FileCheck,
  DollarSign,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const {
    data: statsRes,
    isLoading: statsLoading,
    refetch: refetchStats,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ['platformStats'],
    queryFn: () => api.get<{ data: PlatformStats }>('/api/admin/stats'),
  });

  const { data: auditRes, isLoading: auditLoading } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: () => api.get<{ data: StatusHistoryItem[] }>('/api/admin/audit-logs?limit=10'),
  });

  const stats = statsRes?.data;
  const auditLogs = auditRes?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Platform overview and recent activity.
          </p>
        </div>

        <button
          onClick={() => refetchStats()}
          disabled={statsFetching}
          className="self-start sm:self-auto p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${statsFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Users</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {statsLoading ? '—' : stats?.users.total ?? 0}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
            <span>{stats?.users.buyers ?? 0} buyers</span>
            <span>•</span>
            <span>{stats?.users.vendors ?? 0} vendors</span>
          </div>
        </div>

        {/* Total RFQs */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">RFQs</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {statsLoading ? '—' : stats?.rfqs.total ?? 0}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
            <span>{stats?.rfqs.published ?? 0} active</span>
            <span>•</span>
            <span>{stats?.rfqs.draft ?? 0} draft</span>
            <span>•</span>
            <span>{stats?.rfqs.awarded ?? 0} awarded</span>
          </div>
        </div>

        {/* Total Quotes */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Bids & Quotes</span>
            <FileCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {statsLoading ? '—' : stats?.quotes.total ?? 0}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
            <span>{stats?.quotes.accepted ?? 0} won</span>
            <span>•</span>
            <span>{stats?.quotes.shortlisted ?? 0} shortlisted</span>
          </div>
        </div>

        {/* Spend */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Awarded Spend</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            ₹{statsLoading ? '—' : (stats?.quotes.totalAwardedSpend ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Pipeline: ₹{(stats?.rfqs.totalBudget ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/users"
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all group flex items-center justify-between"
        >
          <div>
            <div className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
              User Management
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Add users, change roles, manage accounts
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/admin/rfqs"
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all group flex items-center justify-between"
        >
          <div>
            <div className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
              RFQ Directory
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              View and manage all RFQs across buyers
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/admin/quotes"
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all group flex items-center justify-between"
        >
          <div>
            <div className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
              Quotes & Bids
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Inspect submitted vendor quotations
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Recent Status Changes</h3>
          <Link to="/admin/audit-logs" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            View All &rarr;
          </Link>
        </div>

        {auditLoading ? (
          <div className="py-6 text-center text-slate-400 text-xs">Loading activity...</div>
        ) : auditLogs.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">No recent activity.</div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {log.entityType}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {log.changedBy?.name || 'System'}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {log.fromStatus} &rarr; <span className="text-indigo-600 font-semibold">{log.toStatus}</span>
                  </span>
                  {log.targetQuote && (
                    <span className="text-emerald-700 font-medium text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      Vendor: {log.targetQuote.vendorName}
                    </span>
                  )}
                  {log.reason && (
                    <span className="text-slate-500 italic hidden md:inline text-[11px]">
                      ({log.reason})
                    </span>
                  )}
                </div>

                <div className="text-slate-400 text-[11px] font-mono shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                  {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
