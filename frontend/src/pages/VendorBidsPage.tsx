import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { VendorBid } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileCheck,
  Search,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Award,
} from 'lucide-react';

export const VendorBidsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';
  const [activeTab, setActiveTab] = useState<string>(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all vendor bids
  const { data: bidsData, isLoading, refetch, isFetching } = useQuery<{ data: VendorBid[] }>({
    queryKey: ['vendorBids'],
    queryFn: () => api.get<{ data: VendorBid[] }>('/api/vendor/bids'),
  });

  const bids = bidsData?.data || [];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'ALL') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', tab);
    }
    setSearchParams(searchParams);
  };

  // Filter bids by status tab and search query
  const filteredBids = bids.filter((bid) => {
    // Tab filter
    if (activeTab === 'SUBMITTED' && bid.status !== 'SUBMITTED') return false;
    if (activeTab === 'SHORTLISTED' && bid.status !== 'SHORTLISTED') return false;
    if (activeTab === 'ACCEPTED' && bid.status !== 'ACCEPTED') return false;
    if (activeTab === 'REJECTED' && bid.status !== 'REJECTED') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = bid.rfq.title.toLowerCase().includes(query);
      const matchBuyer = bid.rfq.buyer.name.toLowerCase().includes(query);
      const matchCategory = bid.rfq.category?.toLowerCase().includes(query);
      if (!matchTitle && !matchBuyer && !matchCategory) return false;
    }

    return true;
  });

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

  const counts = {
    ALL: bids.length,
    SUBMITTED: bids.filter((b) => b.status === 'SUBMITTED').length,
    SHORTLISTED: bids.filter((b) => b.status === 'SHORTLISTED').length,
    ACCEPTED: bids.filter((b) => b.status === 'ACCEPTED').length,
    REJECTED: bids.filter((b) => b.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Quotations & Bids</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Full audit log of all quotes placed across RFQs, revision histories, and award statuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
            title="Refresh Quotes"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/rfqs"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Browse RFQs</span>
          </Link>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Bids', count: counts.ALL },
              { id: 'SUBMITTED', label: 'Under Review', count: counts.SUBMITTED },
              { id: 'SHORTLISTED', label: 'Shortlisted', count: counts.SHORTLISTED },
              { id: 'ACCEPTED', label: 'Won Contracts', count: counts.ACCEPTED },
              { id: 'REJECTED', label: 'Archived', count: counts.REJECTED },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-slate-700 text-slate-100'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title or buyer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-400">Loading quotations...</div>
          ) : filteredBids.length === 0 ? (
            <div className="p-16 text-center">
              <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No Quotes Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No quotations matched your search criteria.'
                  : 'You have no quotes submitted in this category yet.'}
              </p>
              <Link
                to="/rfqs"
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Browse Open RFQs
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">RFQ Title</th>
                  <th className="py-3 px-4">Buyer Organization</th>
                  <th className="py-3 px-4">Revision</th>
                  <th className="py-3 px-4">Quoted Amount</th>
                  <th className="py-3 px-4">Lead Time</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBids.map((bid) => (
                  <tr key={bid.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/rfqs/${bid.rfqId}`}
                        className="font-medium text-slate-900 hover:text-indigo-600 truncate block max-w-xs"
                      >
                        {bid.rfq.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-medium uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {bid.rfq.category || 'General'}
                        </span>
                        <span className="text-xs text-slate-400">
                          RFQ Status: {bid.rfq.status}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{bid.rfq.buyer.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                        {bid.rfq.buyer.email}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        v{bid.currentRevisionNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {formatCurrency(bid.latestRevision?.totalAmount)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Budget: {bid.rfq.budget ? formatCurrency(bid.rfq.budget) : 'Open'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-600">
                      {bid.latestRevision?.deliveryDays ? (
                        <span>{bid.latestRevision.deliveryDays} business days</span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatDate(bid.createdAt)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={bid.status} />
                      {bid.status === 'ACCEPTED' && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-700">
                          <Award className="w-3 h-3" />
                          <span>Contract Awarded</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/rfqs/${bid.rfqId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 shadow-sm transition-colors"
                      >
                        <span>View / Revise</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </Link>
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
