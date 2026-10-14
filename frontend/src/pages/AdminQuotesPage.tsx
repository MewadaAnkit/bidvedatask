import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AdminQuote } from '../types';
import {
  Search,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const AdminQuotesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const { data: quotesRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminQuotes', search, selectedStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      return api.get<{ data: AdminQuote[] }>(`/api/admin/quotes?${params.toString()}`);
    },
  });

  const quotes = quotesRes?.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SHORTLISTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quotes & Bids</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of vendor proposals submitted across all RFQs.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RFQ or vendor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'SUBMITTED', label: 'Submitted' },
            { id: 'SHORTLISTED', label: 'Shortlisted' },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedStatus === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading quotes...</div>
        ) : quotes.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No quotes found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">RFQ</th>
                  <th className="py-3 px-4">Buyer</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Bid Total</th>
                  <th className="py-3 px-4 text-center">Delivery</th>
                  <th className="py-3 px-4 text-center">Rev</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((q) => {
                  const latestRev = q.revisions?.[0];

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          to={`/admin/rfqs/${q.rfq.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors block"
                        >
                          {q.rfq.title}
                        </Link>
                        <span className="text-[10px] text-slate-400 font-medium uppercase">
                          {q.rfq.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <div>{q.rfq.buyer.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{q.rfq.buyer.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{q.vendor.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{q.vendor.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadge(q.status)}`}>
                          {q.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-slate-900">
                          {latestRev ? `₹${Number(latestRev.totalAmount).toLocaleString()}` : '—'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {latestRev?.deliveryDays ? `${latestRev.deliveryDays}d` : '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-slate-600">v{q.currentRevisionNumber}</span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admin/rfqs/${q.rfq.id}/comparison`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                        >
                          Compare &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
