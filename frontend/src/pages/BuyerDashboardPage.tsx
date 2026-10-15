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
  MapPin,
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
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total RFQs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total RFQs</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {isStatsLoading ? '—' : stats?.totalRfqs ?? 0}
          </div>
        </div>

        {/* Open For Bidding */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Published</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            {isStatsLoading ? '—' : stats?.publishedRfqs ?? 0}
          </div>
        </div>

        {/* Quotes Received */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Bids Received</span>
            <FileCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {isStatsLoading ? '—' : stats?.totalQuotesReceived ?? 0}
          </div>
        </div>

        {/* Pending Evaluation */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Review</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 font-mono">
            {isStatsLoading ? '—' : stats?.pendingEvaluationCount ?? 0}
          </div>
        </div>

        {/* Awarded Spend */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Awarded Spend</span>
            <DollarSign className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono truncate">
            {isStatsLoading ? '—' : formatCurrency(stats?.totalAwardedSpend)}
          </div>
        </div>
      </div>

      {/* Recent RFQs Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent RFQs</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active sourcing requisitions and quotes
            </p>
          </div>
          <Link
            to="/rfqs"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {isRfqsLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading RFQs...</div>
          ) : recentRfqs.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
              <h3 className="text-sm font-medium text-slate-800">No RFQs yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Create a Request for Quotation to start receiving quotes from vendors.
              </p>
              <Link
                to="/rfqs/new"
                className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <span>Create an RFQ &rarr;</span>
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
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>{rfq.lineItems?.length || 0} line items</span>
                        {rfq.deliveryLocation && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px] flex items-center gap-1 text-slate-500" title={rfq.deliveryLocation}>
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {rfq.deliveryLocation}
                            </span>
                          </>
                        )}
                      </div>
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
