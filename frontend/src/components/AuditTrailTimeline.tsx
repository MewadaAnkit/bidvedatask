import React, { useState, useMemo } from 'react';
import { StatusHistoryItem } from '../types';
import {
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Star,
  Award,
  Lock,
  Clock,
  ArrowRight,
  User,
  Shield,
  Building2,
  Store,
  Filter,
  ArrowUpDown,
  Search,
  MessageSquare,
  DollarSign,
  Calendar,
  Layers,
} from 'lucide-react';

interface AuditTrailTimelineProps {
  items: StatusHistoryItem[];
  title?: string;
  subtitle?: string;
}

export const AuditTrailTimeline: React.FC<AuditTrailTimelineProps> = ({
  items,
  title = 'Audit Trail & Compliance History',
  subtitle = 'Immutable record of who performed each change, target entity details, and exact timestamps.',
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'RFQ' | 'QUOTE'>('ALL');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [searchQuery, setSearchQuery] = useState('');

  // Format relative time (e.g. "2 hours ago")
  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'SY';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'BUYER':
        return {
          label: 'Buyer',
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: Building2,
        };
      case 'VENDOR':
        return {
          label: 'Vendor',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Store,
        };
      case 'ADMIN':
        return {
          label: 'Admin',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Shield,
        };
      default:
        return {
          label: 'System',
          className: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: User,
        };
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
      case 'AWARDED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
      case 'SHORTLISTED':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
      case 'SUBMITTED':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'NONE':
        return 'bg-slate-50 text-slate-400 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getEventVisuals = (item: StatusHistoryItem) => {
    if (item.entityType === 'RFQ') {
      if (item.toStatus === 'DRAFT') {
        return {
          icon: FileText,
          iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
          headline: 'RFQ Created in Draft',
          subtext: 'Initial specifications and line items drafted',
        };
      }
      if (item.toStatus === 'PUBLISHED') {
        return {
          icon: Send,
          iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
          headline: 'RFQ Published for Bidding',
          subtext: 'Marketplace bidding opened for vendor quote submissions',
        };
      }
      if (item.toStatus === 'AWARDED') {
        return {
          icon: Award,
          iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          headline: 'RFQ Successfully Awarded',
          subtext: 'Procurement evaluation finalized and winning bid chosen',
        };
      }
      if (item.toStatus === 'CLOSED') {
        return {
          icon: Lock,
          iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
          headline: 'RFQ Bidding Closed',
          subtext: 'Bidding deadline reached or manually closed',
        };
      }
    }

    // EntityType === 'QUOTE'
    const targetVendor = item.targetQuote?.vendorName || (item.changedBy?.role === 'VENDOR' ? item.changedBy.name : 'Vendor');

    if (item.toStatus === 'SUBMITTED') {
      if (item.fromStatus === 'NONE') {
        return {
          icon: FileText,
          iconBg: 'bg-sky-100 text-sky-700 border-sky-200',
          headline: `Quote Submitted by ${targetVendor}`,
          subtext: `Initial quotation received for procurement evaluation`,
        };
      }
      if (item.fromStatus === 'SHORTLISTED') {
        return {
          icon: Star,
          iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
          headline: `Quote Shortlist Revoked for ${targetVendor}`,
          subtext: `Quote reverted to standard submitted status`,
        };
      }
      return {
        icon: FileText,
        iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        headline: `Quote Revision Submitted by ${targetVendor}`,
        subtext: `Revised pricing and delivery schedule submitted`,
      };
    }

    if (item.toStatus === 'SHORTLISTED') {
      return {
        icon: Star,
        iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
        headline: `Shortlisted Quote from ${targetVendor}`,
        subtext: `Candidate selected for commercial comparison & final negotiation`,
      };
    }

    if (item.toStatus === 'ACCEPTED') {
      return {
        icon: CheckCircle2,
        iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        headline: `Accepted & Awarded Quote from ${targetVendor}`,
        subtext: `Winning quotation selected for contract award`,
      };
    }

    if (item.toStatus === 'REJECTED') {
      return {
        icon: XCircle,
        iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
        headline: `Rejected Quote from ${targetVendor}`,
        subtext: `Quote eliminated after competitor bid was awarded`,
      };
    }

    return {
      icon: Clock,
      iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
      headline: `${item.entityType} Status: ${item.fromStatus} → ${item.toStatus}`,
      subtext: item.reason || 'Status transition event recorded',
    };
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filter by entity type
    if (filterType !== 'ALL') {
      result = result.filter((i) => i.entityType === filterType);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.changedBy?.name?.toLowerCase().includes(q) ||
          i.changedBy?.email?.toLowerCase().includes(q) ||
          i.targetQuote?.vendorName?.toLowerCase().includes(q) ||
          i.targetQuote?.vendorEmail?.toLowerCase().includes(q) ||
          i.reason?.toLowerCase().includes(q) ||
          i.fromStatus.toLowerCase().includes(q) ||
          i.toStatus.toLowerCase().includes(q)
      );
    }

    // Sort order
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [items, filterType, sortOrder, searchQuery]);

  const counts = useMemo(() => {
    const rfqCount = items.filter((i) => i.entityType === 'RFQ').length;
    const quoteCount = items.filter((i) => i.entityType === 'QUOTE').length;
    return { all: items.length, rfq: rfqCount, quote: quoteCount };
  }, [items]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 font-mono text-slate-700 font-medium">
              {items.length} records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Entity Filter Tabs */}
          <div className="inline-flex rounded-lg bg-slate-200/60 p-0.5 text-xs font-medium">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setFilterType('RFQ')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterType === 'RFQ'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              RFQ ({counts.rfq})
            </button>
            <button
              onClick={() => setFilterType('QUOTE')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterType === 'QUOTE'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quotes ({counts.quote})
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium transition-colors"
            title="Toggle chronological sorting"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar (if more than 4 items) */}
      {items.length > 4 && (
        <div className="px-5 py-2.5 bg-slate-50/25 border-b border-slate-100 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by actor name, vendor, status, or notes..."
            className="w-full text-xs bg-transparent border-none focus:outline-none placeholder-slate-400 text-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[11px] text-slate-400 hover:text-slate-600 uppercase font-medium"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Timeline Content */}
      <div className="p-6">
        {filteredAndSortedItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No audit records match the selected filter.
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filteredAndSortedItems.map((item) => {
              const visuals = getEventVisuals(item);
              const IconComponent = visuals.icon;
              const roleBadge = getRoleBadge(item.changedBy?.role);
              const RoleIcon = roleBadge.icon;

              const isQuote = item.entityType === 'QUOTE';
              const vendorTargetName = item.targetQuote?.vendorName;

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0.5 w-7 h-7 rounded-full border shadow-2xs flex items-center justify-center transition-transform group-hover:scale-110 ${visuals.iconBg}`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>

                  {/* Card Content */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs transition-all space-y-3">
                    {/* Top Row: Event Headline + Timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {visuals.headline}
                        </span>
                        <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                          {item.entityType}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono shrink-0">
                        <span className="font-semibold text-slate-700">
                          {getRelativeTime(item.createdAt)}
                        </span>
                        <span>•</span>
                        <span title={new Date(item.createdAt).toISOString()}>
                          {new Date(item.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Actor Identity & Transition Pill */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                      {/* WHO: Performed By */}
                      <div className="flex items-center gap-2">
                        {/* Avatar */}
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                          {getInitials(item.changedBy?.name)}
                        </div>

                        {/* Actor details */}
                        <div className="text-xs">
                          <span className="font-semibold text-slate-800">
                            {item.changedBy?.name || 'System Automation'}
                          </span>
                          <span className="text-slate-400 text-[11px] ml-1.5 hidden sm:inline">
                            ({item.changedBy?.email || 'automated-task'})
                          </span>
                        </div>

                        {/* Role Chip */}
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadge.className}`}
                        >
                          <RoleIcon className="w-2.5 h-2.5" />
                          {roleBadge.label}
                        </span>
                      </div>

                      {/* State Transition Diff */}
                      <div className="inline-flex items-center gap-1.5 text-xs font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[11px] ${getStatusPill(
                            item.fromStatus
                          )}`}
                        >
                          {item.fromStatus}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[11px] ${getStatusPill(
                            item.toStatus
                          )}`}
                        >
                          {item.toStatus}
                        </span>
                      </div>
                    </div>

                    {/* Target Specifics (Quotes: Vendor name, Total Amount, Delivery Days) */}
                    {(isQuote && (vendorTargetName || item.targetQuote)) && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-500">Target Quotation:</span>
                          <span className="font-semibold text-slate-800">
                            {vendorTargetName || item.targetQuote?.vendorName || 'Vendor'}
                          </span>
                          {item.targetQuote?.vendorEmail && (
                            <span className="text-slate-400 text-[11px]">
                              ({item.targetQuote.vendorEmail})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
                          {item.targetQuote?.totalAmount != null && (
                            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              ₹{Number(item.targetQuote.totalAmount).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          )}
                          {item.targetQuote?.deliveryDays != null && (
                            <span>{item.targetQuote.deliveryDays} Days Lead Time</span>
                          )}
                          {item.targetQuote?.currentRevisionNumber != null && (
                            <span className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                              Rev {item.targetQuote.currentRevisionNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Reason / Notes Callout */}
                    {item.reason && (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/40 border border-amber-200/60 text-xs text-slate-700">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="leading-relaxed">
                          <span className="font-semibold text-amber-900">Recorded Reason:</span>{' '}
                          <span className="text-slate-700 italic">{item.reason}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
