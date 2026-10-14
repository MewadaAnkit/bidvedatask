import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import { ComparisonData } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  Award,
  Star,
  Clock,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  TrendingDown,
  Zap,
} from 'lucide-react';

export const ComparisonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const toast = useToast();

  const [sortBy, setSortBy] = useState<'totalAmount' | 'deliveryDays'>('totalAmount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedAwardQuoteId, setSelectedAwardQuoteId] = useState<string | null>(null);
  const [awardReason, setAwardReason] = useState<string>('Best overall commercial and technical fit');

  // Fetch Side-by-Side Comparison Matrix
  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ['comparison', id, sortBy, sortOrder],
    queryFn: () =>
      api.get<{ data: ComparisonData }>(
        `/api/rfqs/${id}/comparison?sortBy=${sortBy}&sortOrder=${sortOrder}`
      ),
  });

  const matrix = res?.data;

  // Toggle Shortlist Mutation
  const shortlistMutation = useMutation({
    mutationFn: (quoteId: string) =>
      api.patch(`/api/rfqs/${id}/quotes/${quoteId}/shortlist`),
    onSuccess: () => {
      refetch();
      toast.success('Quote shortlist status updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update shortlist status', {
        title: 'Shortlist Update Failed',
      });
    },
  });

  // Award RFQ Mutation
  const awardMutation = useMutation({
    mutationFn: (payload: { quoteId: string; reason: string }) =>
      api.post(`/api/rfqs/${id}/award`, payload),
    onSuccess: () => {
      setSelectedAwardQuoteId(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['rfq', id] });
      toast.success('Contract awarded successfully! The selected quote has been accepted.', {
        title: 'RFQ Awarded',
      });
    },
    onError: (err: any) => {
      let friendlyMsg = err.message || 'Failed to award RFQ';
      if (err.code === 'DEADLINE_NOT_PASSED' || friendlyMsg.toLowerCase().includes('deadline')) {
        const deadlineDate = matrix?.rfq?.deadline ? new Date(matrix.rfq.deadline) : null;
        if (deadlineDate && !isNaN(deadlineDate.getTime())) {
          const day = String(deadlineDate.getDate()).padStart(2, '0');
          const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
          const year = deadlineDate.getFullYear();
          let hours = deadlineDate.getHours();
          const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
          const formatted = `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
          friendlyMsg = `Cannot award RFQ before the submission deadline has elapsed. Vendor bidding is active until ${formatted}. Please wait until the deadline closes to award the contract.`;
        }
      }
      toast.error(friendlyMsg, {
        title: 'Cannot Award RFQ',
      });
    },
  });

  const handleToggleSort = (field: 'totalAmount' | 'deliveryDays') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (isLoading || !matrix) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
        <p>Generating side-by-side comparison matrix...</p>
      </div>
    );
  }

  const isRfqAwarded = matrix.rfq.status === 'AWARDED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Back Link */}
      <Link
        to={`/rfqs/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to RFQ Detail</span>
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Side-by-Side Quote Comparison</h1>
            <StatusBadge status={matrix.rfq.status} />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Comparing {matrix.quotes.length} submitted bids for "{matrix.rfq.title}"
          </p>
        </div>

        {/* Sorting Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-slate-500">Sort by:</span>
          <button
            onClick={() => handleToggleSort('totalAmount')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors shadow-sm ${
              sortBy === 'totalAmount'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>Total Price</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleToggleSort('deliveryDays')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors shadow-sm ${
              sortBy === 'deliveryDays'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>Delivery Days</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
      </div>


      {/* Benchmark Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Lowest Total Bid</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {matrix.benchmarks.lowestTotal
                ? `₹${matrix.benchmarks.lowestTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : 'N/A'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Fastest Delivery</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {matrix.benchmarks.fastestDelivery
                ? `${matrix.benchmarks.fastestDelivery} Days`
                : 'N/A'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Bids Evaluated</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {matrix.quotes.length} Quotes
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Table Matrix */}
      {matrix.quotes.length > 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Vendor Column Headers */}
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-4 min-w-[220px] font-semibold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50 z-20 border-r border-slate-200">
                  Line Items ({matrix.lineItems.length})
                </th>
                {matrix.quotes.map((q) => {
                  const isWinningQuote = q.status === 'ACCEPTED';
                  const isLowest = q.totalAmount === matrix.benchmarks.lowestTotal;
                  const isFastest = q.deliveryDays === matrix.benchmarks.fastestDelivery;

                  return (
                    <th
                      key={q.quoteId}
                      className={`py-4 px-4 min-w-[240px] align-top border-l border-slate-200 ${
                        isWinningQuote
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : ''
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <StatusBadge status={q.status} size="sm" />
                          <span className="text-[11px] text-slate-400 font-mono">
                            Rev #{q.currentRevisionNumber}
                          </span>
                        </div>

                        <div className="font-semibold text-sm text-slate-900">{q.vendorName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{q.vendorEmail}</div>

                        {/* Benchmark Highlights */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {isLowest && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                              Lowest Price
                            </span>
                          )}
                          {isFastest && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200">
                              Fastest
                            </span>
                          )}
                        </div>

                        {/* Shortlist & Award Buttons */}
                        {!isRfqAwarded && (
                          <div className="flex items-center gap-1.5 pt-2">
                            <button
                              onClick={() => shortlistMutation.mutate(q.quoteId)}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 shadow-sm ${
                                q.status === 'SHORTLISTED'
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                              }`}
                              title="Toggle Shortlist"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span className="text-[11px]">
                                {q.status === 'SHORTLISTED' ? 'Shortlisted' : 'Shortlist'}
                              </span>
                            </button>

                            <button
                              onClick={() => setSelectedAwardQuoteId(q.quoteId)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Award</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Line Items Pricing Rows */}
            <tbody className="divide-y divide-slate-100 font-sans">
              {matrix.lineItems.map((li) => (
                <tr key={li.id} className="hover:bg-slate-50/75 transition-colors">
                  <td className="py-3 px-4 sticky left-0 bg-white z-10 border-r border-slate-200">
                    <div className="font-medium text-slate-900">{li.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Qty: {Number(li.quantity).toLocaleString()} {li.unit}
                    </div>
                  </td>

                  {matrix.quotes.map((q) => {
                    const priceInfo = q.itemPrices[li.id];
                    return (
                      <td key={q.quoteId} className="py-3 px-4 border-l border-slate-200 font-mono">
                        {priceInfo ? (
                          <div>
                            <div className="text-slate-900 font-semibold">
                              ₹{Number(priceInfo.unitPrice).toFixed(2)} / {li.unit}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Total: ₹{Number(priceInfo.lineTotal).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-500 italic">Not Quoted</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Delivery Turnaround Row */}
              <tr className="bg-slate-50/80 border-t-2 border-slate-200">
                <td className="py-3 px-4 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Delivery Turnaround
                </td>
                {matrix.quotes.map((q) => (
                  <td key={q.quoteId} className="py-3 px-4 border-l border-slate-200 font-mono font-semibold text-slate-800">
                    {q.deliveryDays} Days
                  </td>
                ))}
              </tr>

              {/* Quotation Notes Row */}
              <tr className="bg-white">
                <td className="py-3 px-4 font-semibold text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-200">
                  Notes & Concessions
                </td>
                {matrix.quotes.map((q) => (
                  <td key={q.quoteId} className="py-3 px-4 border-l border-slate-200 text-slate-600 italic text-[11px]">
                    {q.notes || 'No notes provided'}
                  </td>
                ))}
              </tr>

              {/* Grand Total Row */}
              <tr className="bg-slate-50 border-t-2 border-slate-300">
                <td className="py-4 px-4 font-bold text-slate-900 text-sm sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  Total Bid Amount (INR)
                </td>
                {matrix.quotes.map((q) => {
                  const isLowest = q.totalAmount === matrix.benchmarks.lowestTotal;
                  return (
                    <td key={q.quoteId} className="py-4 px-4 border-l border-slate-200 font-mono">
                      <div className={`text-lg font-bold ${isLowest ? 'text-emerald-700' : 'text-slate-900'}`}>
                        ₹{q.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {isLowest && (
                        <span className="text-[10px] text-emerald-600 font-sans font-semibold">
                          ★ Lowest Total
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl border border-slate-200 bg-white shadow-sm">
          <p className="text-slate-500 text-sm">No quotes have been submitted for this RFQ yet.</p>
        </div>
      )}

      {/* Atomic Contract Award Confirmation Modal */}
      {selectedAwardQuoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl p-6 bg-white border border-slate-200 shadow-xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Award Contract to Vendor</h3>
                <p className="text-xs text-slate-500">
                  This executes an atomic contract award in the system.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">Irreversible Procurement Action:</span>
                <p className="text-amber-700 leading-relaxed">
                  The chosen quote will be marked <strong>ACCEPTED</strong>, all competing bids will be marked <strong>REJECTED</strong>, and the RFQ will transition to <strong>AWARDED</strong>.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Procurement Justification / Award Reason
              </label>
              <textarea
                rows={3}
                value={awardReason}
                onChange={(e) => setAwardReason(e.target.value)}
                placeholder="Reason for selection..."
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none shadow-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAwardQuoteId(null)}
                disabled={awardMutation.isPending}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  awardMutation.mutate({
                    quoteId: selectedAwardQuoteId,
                    reason: awardReason,
                  })
                }
                disabled={awardMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {awardMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing Atomic Award...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Award RFQ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
