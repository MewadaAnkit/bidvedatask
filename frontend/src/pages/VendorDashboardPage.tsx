import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { VendorStats, VendorBid, RFQ } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileCheck,
  Award,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Building2,
  DollarSign,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const VendorDashboardPage: React.FC = () => {
  // 1. Fetch vendor KPIs
  const { data: statsData, isLoading: isStatsLoading } = useQuery<{ data: VendorStats }>({
    queryKey: ['vendorStats'],
    queryFn: () => api.get<{ data: VendorStats }>('/api/vendor/stats'),
  });

  // 2. Fetch vendor's bids
  const { data: bidsData, isLoading: isBidsLoading } = useQuery<{ data: VendorBid[] }>({
    queryKey: ['vendorBids'],
    queryFn: () => api.get<{ data: VendorBid[] }>('/api/vendor/bids'),
  });

  // 3. Fetch top open RFQs
  const { data: rfqsData, isLoading: isRfqsLoading } = useQuery<{
    data: RFQ[];
    meta: { total: number };
  }>({
    queryKey: ['openRfqsPreview'],
    queryFn: () =>
      api.get<{ data: RFQ[]; meta: { total: number } }>(
        '/api/rfqs?limit=4&sortBy=deadline&sortOrder=asc'
      ),
  });

  const stats = statsData?.data;
  const bids = bidsData?.data || [];
  const openRfqs = rfqsData?.data || [];

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
        {/* Open Opportunities */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Marketplace</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {isStatsLoading ? '—' : stats?.openRfqsCount ?? 0}
          </div>
        </div>

        {/* Total Bids Placed */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Placed</span>
            <FileCheck className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {isStatsLoading ? '—' : stats?.totalBids ?? 0}
          </div>
        </div>

        {/* Active Under Review */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Bids</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 font-mono">
            {isStatsLoading ? '—' : stats?.activeBids ?? 0}
          </div>
        </div>

        {/* Won Contracts */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Won Contracts</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            {isStatsLoading ? '—' : stats?.wonBids ?? 0}
          </div>
        </div>

        {/* Won Value */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Awarded Value</span>
            <DollarSign className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono truncate">
            {isStatsLoading ? '—' : formatCurrency(stats?.wonValue)}
          </div>
        </div>
      </div>

      {/* Main 2 Columns: Recent Bids & Closing Soon RFQs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Recent Bids */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Quotations</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track latest bids and revise pricing before deadlines
              </p>
            </div>
            <Link
              to="/my-bids"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            {isBidsLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading quotations...</div>
            ) : bids.length === 0 ? (
              <div className="p-12 text-center">
                <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-800">No Bids Placed Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You haven&apos;t submitted any quotes yet. Browse the open RFQs to find procurement opportunities.
                </p>
                <Link
                  to="/rfqs"
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Browse Marketplace
                </Link>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="py-3 px-4">RFQ Title</th>
                    <th className="py-3 px-4">Revision</th>
                    <th className="py-3 px-4">Quoted Amount</th>
                    <th className="py-3 px-4">Delivery</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bids.slice(0, 5).map((bid) => (
                    <tr key={bid.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          to={`/rfqs/${bid.rfqId}`}
                          className="font-medium text-slate-900 hover:text-indigo-600 truncate block max-w-xs"
                        >
                          {bid.rfq.title}
                        </Link>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {bid.rfq.buyer.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">
                        Rev #{bid.currentRevisionNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {formatCurrency(bid.latestRevision?.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {bid.latestRevision?.deliveryDays} days
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={bid.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/rfqs/${bid.rfqId}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          View RFQ
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right 1 Col: Opportunities Closing Soon */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Closing Soon</h2>
              <p className="text-xs text-slate-500 mt-0.5">High-priority RFQs accepting bids</p>
            </div>
            <Link
              to="/rfqs"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              <span>Explore</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {isRfqsLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading opportunities...</div>
            ) : openRfqs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No active RFQs closing soon</div>
            ) : (
              openRfqs.slice(0, 4).map((rfq) => (
                <div key={rfq.id} className="py-3.5 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/rfqs/${rfq.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-indigo-600 line-clamp-1"
                    >
                      {rfq.title}
                    </Link>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                      {rfq.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3 text-amber-500" />
                      Deadline: {formatDate(rfq.deadline)}
                    </span>
                    <span className="font-medium text-slate-700">
                      {rfq.budget ? formatCurrency(rfq.budget) : 'Open Budget'}
                    </span>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {rfq.lineItems?.length || 0} line items
                    </span>
                    <Link
                      to={`/rfqs/${rfq.id}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Place Quote →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
