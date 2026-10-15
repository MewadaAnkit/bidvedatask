import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../api/client';
import { RFQ, Quote, Attachment, StatusHistoryItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { QuoteModal } from '../components/QuoteModal';
import { FileUploadModal } from '../components/FileUploadModal';
import { AuditTrailTimeline } from '../components/AuditTrailTimeline';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  Layers,
  Send,
  Edit,
  UploadCloud,
  FileText,
  Download,
  Clock,
  History,
  CheckCircle2,
  BarChart3,
  Building2,
  Lock,
  Loader2,
} from 'lucide-react';

export const RFQDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const toast = useToast();
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isSpecUploadOpen, setIsSpecUploadOpen] = useState(false);
  const [isQuoteDocUploadOpen, setIsQuoteDocUploadOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadAttachment = async (attId: string, filename: string) => {
    try {
      setDownloadingId(attId);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attachments/${attId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        window.location.href = `/api/attachments/${attId}/download?token=${token || ''}`;
        return;
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      const token = localStorage.getItem('token');
      window.location.href = `/api/attachments/${attId}/download?token=${token || ''}`;
    } finally {
      setDownloadingId(null);
    }
  };

  // 1. Fetch RFQ Master Data
  const { data: rfqRes, isLoading: rfqLoading } = useQuery({
    queryKey: ['rfq', id],
    queryFn: () => api.get<{ data: RFQ }>(`/api/rfqs/${id}`),
  });

  const rfq = rfqRes?.data;

  // 2. Fetch Vendor's Own Quote (if Vendor)
  const { data: myQuoteRes, refetch: refetchMyQuote } = useQuery({
    queryKey: ['myQuote', id, user?.id],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: Quote | null }>(`/api/rfqs/${id}/my-quote`);
        return res;
      } catch (err: any) {
        if (err.code === 'NOT_FOUND' || err.message?.includes('404')) {
          return { data: null };
        }
        throw err;
      }
    },
    enabled: user?.role === 'VENDOR' && Boolean(rfq) && Boolean(user?.id),
    retry: false,
  });

  const myQuote = myQuoteRes?.data || null;

  // 3. Fetch RFQ Specs
  const { data: attachmentsRes, refetch: refetchAttachments } = useQuery({
    queryKey: ['attachments', id],
    queryFn: () => api.get<{ data: Attachment[] }>(`/api/rfqs/${id}/attachments`),
    enabled: Boolean(rfq),
  });

  // 4. Fetch Status History (Strictly restricted to Buyers and Admins)
  const { data: historyRes } = useQuery({
    queryKey: ['statusHistory', id, user?.id],
    queryFn: () => api.get<{ data: StatusHistoryItem[] }>(`/api/rfqs/${id}/status-history`),
    enabled: user?.role !== 'VENDOR' && Boolean(rfq) && Boolean(user?.id),
  });

  // Mutation: Publish RFQ (Buyer only)
  const publishMutation = useMutation({
    mutationFn: () => api.patch(`/api/rfqs/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq', id] });
      queryClient.invalidateQueries({ queryKey: ['statusHistory', id] });
      toast.success('RFQ published successfully! Vendors can now submit bids.', {
        title: 'RFQ Published',
      });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to publish RFQ', {
        title: 'Publish Failed',
      });
    },
  });

  if (rfqLoading || !rfq) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center text-slate-400">
        <p>Loading RFQ details...</p>
      </div>
    );
  }

  const isOwner = user?.id === rfq.buyerId;
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isOwner || isAdmin;
  const isExpired = new Date() > new Date(rfq.deadline);
  const canPublish = canManage && rfq.status === 'DRAFT' && !isExpired;
  const canEdit = canManage && rfq.status === 'DRAFT';
  const canBid = user?.role === 'VENDOR' && rfq.status === 'PUBLISHED' && !isExpired;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Navigation */}
      <Link
        to="/rfqs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to RFQs</span>
      </Link>


      {/* RFQ Hero Card */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-600 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                {rfq.category}
              </span>
              <StatusBadge status={rfq.status} />
              {isExpired && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  Deadline Expired
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {rfq.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
              {rfq.description}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            {canPublish && (
              <button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{publishMutation.isPending ? 'Publishing...' : 'Publish to Market'}</span>
              </button>
            )}

            {canEdit && (
              <Link
                to={`/rfqs/${rfq.id}/edit`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Draft</span>
              </Link>
            )}

            {(isOwner || user?.role === 'ADMIN') && rfq.status !== 'DRAFT' && (
              <Link
                to={`/rfqs/${rfq.id}/comparison`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Compare Quotes</span>
              </Link>
            )}

            {canBid && (
              <button
                onClick={() => setIsQuoteModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                <span>{myQuote ? 'Revise Your Quote' : 'Submit Quotation'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Deadline (Server Clock)
            </span>
            <span className={`font-mono mt-1 block font-medium ${isExpired ? 'text-amber-700' : 'text-slate-800'}`}>
              {new Date(rfq.deadline).toLocaleDateString()} {new Date(rfq.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div>
            <span className="text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Target Budget
            </span>
            <span className="font-mono font-semibold text-slate-900 mt-1 block">
              {rfq.budget ? `₹${Number(rfq.budget).toLocaleString()}` : 'Unspecified'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Issuing Buyer
            </span>
            <span className="font-medium text-slate-800 mt-1 block">
              {rfq.buyer?.name || 'Authorized Buyer'}
            </span>
          </div>
        </div>

        {/* Dedicated Delivery Location & Shipping Destination Card */}
        <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Delivery Location & Consignment Address
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Physical Delivery Site</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-800 whitespace-pre-line break-words leading-relaxed">
              {rfq.deliveryLocation}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            Required Line Items ({rfq.lineItems.length})
          </h2>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4 w-16">Item #</th>
                <th className="py-2.5 px-4">Item Name & Description</th>
                <th className="py-2.5 px-4 text-right">Required Quantity</th>
                <th className="py-2.5 px-4">Unit of Measure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {rfq.lineItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                  <td className="py-2.5 px-4 text-slate-400 font-mono">#{idx + 1}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-800">{item.name}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                    {Number(item.quantity).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 uppercase text-slate-600 font-mono">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Specification Attachments Section */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              Technical Specifications & Documents
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Securely stored engineering drawings and specification sheets (PDF / XLSX).
            </p>
          </div>

          {isOwner && rfq.status !== 'AWARDED' && (
            <button
              onClick={() => setIsSpecUploadOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
              <span>Attach Spec File</span>
            </button>
          )}
        </div>

        {attachmentsRes?.data && attachmentsRes.data.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {attachmentsRes.data.map((att) => (
              <div
                key={att.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-100/75 transition-colors group"
              >
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(att.id, att.originalFilename)}
                  className="flex items-center gap-2.5 truncate text-left flex-1 min-w-0 cursor-pointer"
                  title={`Download ${att.originalFilename}`}
                >
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="truncate">
                    <span className="text-xs font-medium text-slate-800 truncate block group-hover:text-indigo-600 transition-colors">
                      {att.originalFilename}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(att.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(att.id, att.originalFilename)}
                  disabled={downloadingId === att.id}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 shadow-sm transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  title="Download File"
                >
                  {downloadingId === att.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
            No specification files attached to this RFQ yet.
          </div>
        )}
      </div>

      {/* Vendor's Sealed Quote View & Historical Revisions */}
      {user?.role === 'VENDOR' && myQuote && (
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Your Active Quotation
                </h2>
                <StatusBadge status={myQuote.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sealed bid protection active. Only you and the issuing buyer can view your bid.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsQuoteDocUploadOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition-colors flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload Quote Doc</span>
              </button>

              {canBid && (
                <button
                  onClick={() => setIsQuoteModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                >
                  Revise Bid
                </button>
              )}
            </div>
          </div>

          {/* Revision History Carousel / Table */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-600">
              Revision Log (Latest Revision #{myQuote.currentRevisionNumber})
            </span>

            {myQuote.revisions?.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Revision #{rev.revisionNumber}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {rev.deliveryDays} Days Turnaround
                    </span>
                    {rev.notes && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 italic">"{rev.notes}"</span>
                      </>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block">Total Amount</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      ₹{Number(rev.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Sub-table for Revision Line Prices */}
                <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px] bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="py-1.5 px-3">Line Item</th>
                        <th className="py-1.5 px-3 text-right">Unit Price</th>
                        <th className="py-1.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {rev.prices?.map((p) => (
                        <tr key={p.id}>
                          <td className="py-1.5 px-3 text-slate-700 font-sans">
                            {p.rfqLineItem?.name || p.rfqLineItemId}
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-600">
                            ₹{Number(p.unitPrice).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-semibold text-slate-900">
                            ₹{Number(p.lineTotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status History & Audit Log (Strictly Buyer & Admin only) */}
      {user?.role !== 'VENDOR' && historyRes?.data && historyRes.data.length > 0 && (
        <AuditTrailTimeline
          items={historyRes.data}
          title="Audit Trail & Status Transitions"
          subtitle="Tamper-evident record of state changes, vendor quote submissions, and procurement actions."
        />
      )}

      {/* Quote Submission Modal */}
      {isQuoteModalOpen && (
        <QuoteModal
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['myQuote', id, user?.id] });
            queryClient.invalidateQueries({ queryKey: ['rfq', id] });
          }}
          rfq={rfq}
          existingQuote={myQuote}
        />
      )}

      {/* RFQ Spec Upload Modal */}
      {isSpecUploadOpen && (
        <FileUploadModal
          isOpen={isSpecUploadOpen}
          onClose={() => setIsSpecUploadOpen(false)}
          onSuccess={() => refetchAttachments()}
          uploadUrl={`/api/rfqs/${rfq.id}/attachments`}
          title="Upload Technical Specification"
          subtitle="Attach engineering drawings or datasheets (.pdf, .xlsx up to 10 MB)"
        />
      )}

      {/* Quote Document Upload Modal */}
      {isQuoteDocUploadOpen && myQuote && (
        <FileUploadModal
          isOpen={isQuoteDocUploadOpen}
          onClose={() => setIsQuoteDocUploadOpen(false)}
          onSuccess={() => refetchMyQuote()}
          uploadUrl={`/api/attachments/quotes/${myQuote.id}/upload`}
          title="Upload Quote Document"
          subtitle="Attach compliance certificates or test reports (.pdf, .xlsx up to 10 MB)"
        />
      )}
    </div>
  );
};
