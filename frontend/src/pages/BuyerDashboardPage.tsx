import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { BuyerStats, RFQ } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Layers,
  Plus,
  FileCheck,
  Award,
  Clock,
  DollarSign,
  ChevronRight,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

export const BuyerDashboardPage: React.FC = () => {
  // 1. Fetch buyer KPIs
  const { data: statsData, isLoading: isStatsLoading } = useQuery<{ data: BuyerStats }>({
    queryKey: ['buyerStats'],
    queryFn: () => api.get<{ data: BuyerStats }>('/api/buyer/stats'),
  });

  // 2. Fetch recent RFQs
  const { data: rfqsData, isLoading: isRfqsLoading } = useQuery<{
    data: RFQ[];
    meta: { total: number };
  }>({
    queryKey: ['buyerRecentRfqs'],
    queryFn: () =>
      api.get<{ data: RFQ[]; meta: { total: number } }>(
        '/api/rfqs?limit=5&sortBy=createdAt&sortOrder=desc'
      ),
  });

  const stats = statsData?.data;
  const recentRfqs = rfqsData?.data || [];

  const formatCurrency = (val?: number | string | null) => {
    if (val === null || val === undefined) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Buyer Procurement Console</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Procurement Manager
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage procurement lifecycles, publish new RFQs, evaluate vendor bids, and award contracts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/buyer/evaluations"
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Bid Evaluations
          </Link>
          <Link
            to="/rfqs/new"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New RFQ</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total RFQs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Total RFQs</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {isStatsLoading ? '...' : stats?.totalRfqs ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">Across all statuses</div>
        </div>

        {/* Open For Bidding */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Published</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-600">
            {isStatsLoading ? '...' : stats?.publishedRfqs ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">Accepting vendor bids</div>
        </div>

        {/* Quotes Received */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Bids Received</span>
            <FileCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {isStatsLoading ? '...' : stats?.totalQuotesReceived ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">Total vendor submissions</div>
        </div>

        {/* Pending Evaluation */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Pending Review</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-600">
            {isStatsLoading ? '...' : stats?.pendingEvaluationCount ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">RFQs ready for award</div>
        </div>

        {/* Awarded Spend */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Awarded Spend</span>
            <DollarSign className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-3 text-xl font-bold text-slate-900 truncate">
            {isStatsLoading ? '...' : formatCurrency(stats?.totalAwardedSpend)}
          </div>
          <div className="mt-1 text-xs text-emerald-700 font-medium">
            {stats?.awardedRfqs ?? 0} contracts awarded
          </div>
        </div>
      </div>

      {/* Recent RFQs Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Procurement RFQs</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Overview of your active sourcing requisitions and incoming quotes
            </p>
          </div>
          <Link
            to="/rfqs"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All RFQs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {isRfqsLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading procurement items...</div>
          ) : recentRfqs.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No RFQs Created Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Get started by creating your first Request For Quotation to invite vendor bids.
              </p>
              <Link
                to="/rfqs/new"
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create RFQ</span>
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">RFQ Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Budget</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Bids Received</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/rfqs/${rfq.id}`}
                        className="font-medium text-slate-900 hover:text-indigo-600 truncate block max-w-xs"
                      >
                        {rfq.title}
                      </Link>
                      <span className="text-xs text-slate-400">
                        {rfq.lineItems?.length || 0} line items
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {rfq.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(rfq.budget)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {formatDate(rfq.deadline)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <FileCheck className="w-3 h-3" />
                        {rfq._count?.quotes ?? 0} quotes
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={rfq.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(rfq._count?.quotes ?? 0) > 0 && (
                          <Link
                            to={`/rfqs/${rfq.id}/comparison`}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors"
                          >
                            Compare Bids
                          </Link>
                        )}
                        <Link
                          to={`/rfqs/${rfq.id}`}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
