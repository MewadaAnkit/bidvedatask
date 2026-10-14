import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { RFQ } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  PlusCircle,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Inbox,
  BarChart3,
  LayoutGrid,
  List,
  Building2,
  Clock,
} from 'lucide-react';

interface RfqListResponse {
  data: RFQ[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const RFQListPage: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const fetchRfqs = async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    if (search.trim()) params.append('search', search.trim());
    if (category.trim()) params.append('category', category.trim());
    if (location.trim()) params.append('deliveryLocation', location.trim());
    if (status) params.append('status', status);

    return await api.get<RfqListResponse>(`/api/rfqs?${params.toString()}`);
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rfqs', user?.id, page, limit, search, category, location, status],
    queryFn: fetchRfqs,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setLocation('');
    setStatus('');
    setPage(1);
  };

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

  const isDeadlinePassed = (deadlineStr: string) => {
    return new Date() > new Date(deadlineStr);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isBuyer = user?.role === 'BUYER';

  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);

  // Generate page numbers array with intelligent ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isAdmin
              ? 'RFQs Platform Directory'
              : isBuyer
              ? 'My RFQ Workspace'
              : 'Open Procurement RFQs'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Comprehensive ledger of all procurement requests published across the organization.'
              : isBuyer
              ? 'Manage your requests for quotation, review incoming vendor proposals, and award contracts.'
              : 'Browse active requests for quotation, review technical specifications, and submit competitive bids.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {(isBuyer || isAdmin) && (
            <Link
              to={isAdmin ? '/admin/rfqs/new' : '/rfqs/new'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create RFQ</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search keyword..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              placeholder="Category (e.g. Machinery)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Location Filter */}
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
              placeholder="Delivery Location..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white transition-all text-slate-700"
            >
              <option value="">All Statuses</option>
              {(isBuyer || isAdmin) && <option value="DRAFT">Drafts</option>}
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
              <option value="AWARDED">Awarded</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Filter
            </button>
            {(search || category || location || status) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* RFQ Grid or Table Content */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-xs">Loading RFQs...</p>
        </div>
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs">
          Failed to fetch RFQs. Please check connection and try again.
        </div>
      ) : data?.data && data.data.length > 0 ? (
        viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.data.map((rfq) => {
              const expired = isDeadlinePassed(rfq.deadline);

              return (
                <div
                  key={rfq.id}
                  className="bg-white p-5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-all shadow-sm flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-600 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        {rfq.category}
                      </span>
                      <StatusBadge status={rfq.status} size="sm" />
                    </div>

                    <div>
                      <Link
                        to={isAdmin ? `/admin/rfqs/${rfq.id}` : `/rfqs/${rfq.id}`}
                        className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1"
                      >
                        {rfq.title}
                      </Link>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {rfq.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          Location:
                        </span>
                        <span className="font-medium truncate max-w-[150px] text-right text-slate-800">
                          {rfq.deliveryLocation}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Deadline:
                        </span>
                        <span
                          className={`font-medium ${
                            expired && rfq.status === 'PUBLISHED'
                              ? 'text-rose-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {formatDate(rfq.deadline)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          Budget:
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(rfq.budget)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{rfq.lineItems?.length || 0} line items</span>
                      {rfq._count?.quotes !== undefined && (
                        <span className="ml-1 text-slate-400 font-mono">
                          ({rfq._count.quotes} bids)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isBuyer && (rfq._count?.quotes ?? 0) > 0 && (
                        <Link
                          to={`/rfqs/${rfq.id}/comparison`}
                          className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors"
                        >
                          Compare
                        </Link>
                      )}

                      {isAdmin && rfq.status !== 'DRAFT' && (
                        <Link
                          to={`/admin/rfqs/${rfq.id}/comparison`}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Compare Quotes"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                      )}

                      <Link
                        to={isAdmin ? `/admin/rfqs/${rfq.id}` : `/rfqs/${rfq.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors group-hover:translate-x-0.5"
                      >
                        <span>View RFQ</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Dense Table View */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="py-3 px-4">RFQ Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Budget</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4">Items / Bids</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          to={isAdmin ? `/admin/rfqs/${rfq.id}` : `/rfqs/${rfq.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600 block max-w-xs truncate"
                        >
                          {rfq.title}
                        </Link>
                        {rfq.buyer && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {rfq.buyer.name}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs font-medium text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {rfq.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600 truncate max-w-[120px]">
                        {rfq.deliveryLocation}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {formatCurrency(rfq.budget)}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600">
                        {formatDate(rfq.deadline)}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600">
                        <span>{rfq.lineItems?.length || 0} items</span>
                        <span className="ml-1 text-slate-400">({rfq._count?.quotes ?? 0} bids)</span>
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={rfq.status} size="sm" />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          to={isAdmin ? `/admin/rfqs/${rfq.id}` : `/rfqs/${rfq.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="p-12 text-center rounded-xl border border-slate-200 bg-white shadow-sm">
          <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No RFQs Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search filters or check back later for newly published requests.
          </p>
          {(search || category || location || status) && (
            <button
              onClick={handleResetFilters}
              className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Always Visible Classic Pagination Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Results summary & limit selector */}
        <div className="flex items-center gap-4 text-xs text-slate-600 w-full sm:w-auto justify-between sm:justify-start">
          <div>
            Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
            <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
            <span className="font-semibold text-slate-900">{total}</span> RFQs
          </div>

          <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="6">6</option>
              <option value="9">9</option>
              <option value="18">18</option>
              <option value="36">36</option>
            </select>
          </div>
        </div>

        {/* Page navigation controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {/* Numbered page pills */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((num, idx) =>
              num === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${num}`}
                  onClick={() => setPage(Number(num))}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    page === num
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {num}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
