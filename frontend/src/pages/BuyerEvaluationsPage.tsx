import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { BuyerEvaluation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileCheck,
  TrendingDown,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
  Award,
  RefreshCw,
} from 'lucide-react';

export const BuyerEvaluationsPage: React.FC = () => {
  const { data, isLoading, refetch, isFetching } = useQuery<{ data: BuyerEvaluation[] }>({
    queryKey: ['buyerEvaluations'],
    queryFn: () => api.get<{ data: BuyerEvaluation[] }>('/api/buyer/evaluations'),
  });

  const evals = data?.data || [];

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bid Evaluations & Shortlisting</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Compare incoming vendor quotes side-by-side, benchmark pricing against budget, and award contracts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
            title="Refresh Evaluations"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Evaluations Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            RFQs with Submitted Vendor Quotes ({evals.length})
          </div>
          <span className="text-xs text-slate-500">
            Click &quot;Compare Matrix&quot; to inspect line-item breakdowns
          </span>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-400">Loading evaluation matrices...</div>
          ) : evals.length === 0 ? (
            <div className="p-16 text-center">
              <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No Bids to Evaluate Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Once vendors submit quotes to your published RFQs, they will appear here ready for side-by-side comparison and award.
              </p>
              <Link
                to="/rfqs"
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                View My RFQs
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">RFQ Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Budget</th>
                  <th className="py-3 px-4">Bids Received</th>
                  <th className="py-3 px-4">Price Range (Lowest - Highest)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evals.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/rfqs/${rfq.id}/comparison`}
                        className="font-medium text-slate-900 hover:text-indigo-600 block max-w-xs truncate"
                      >
                        {rfq.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Deadline: {formatDate(rfq.deadline)}</span>
                        <span>•</span>
                        <span>{rfq.lineItemCount} items</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                        {rfq.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {rfq.budget ? formatCurrency(rfq.budget) : 'Open'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <FileCheck className="w-3 h-3" />
                        {rfq.quoteCount} {rfq.quoteCount === 1 ? 'quote' : 'quotes'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {rfq.lowestBid !== null ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>Lowest: {formatCurrency(rfq.lowestBid)}</span>
                          </div>
                          {rfq.highestBid && rfq.highestBid !== rfq.lowestBid && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Highest: {formatCurrency(rfq.highestBid)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={rfq.status} />
                      {rfq.hasAwardedQuote && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-700">
                          <Award className="w-3 h-3" />
                          <span>Contract Awarded</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/rfqs/${rfq.id}/comparison`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
                        >
                          <span>Compare Matrix</span>
                          <ChevronRight className="w-3.5 h-3.5" />
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
