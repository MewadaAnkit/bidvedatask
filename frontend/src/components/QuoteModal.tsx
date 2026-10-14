import React, { useState, useEffect } from 'react';
import { RFQ, Quote } from '../types';
import { api, ApiError } from '../api/client';
import { DollarSign, Clock, AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rfq: RFQ;
  existingQuote?: Quote | null;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rfq,
  existingQuote,
}) => {
  const isRevision = Boolean(existingQuote && existingQuote.id);

  // Initialize price inputs
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [deliveryDays, setDeliveryDays] = useState<number>(7);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset/sync form state whenever modal opens or existingQuote changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      const latestPrices = existingQuote?.latestRevision?.prices || existingQuote?.revisions?.[0]?.prices;
      const initial: Record<string, number> = {};
      rfq.lineItems.forEach((item) => {
        const match = latestPrices?.find((p) => p.rfqLineItemId === item.id);
        initial[item.id] = match ? Number(match.unitPrice) : 0;
      });
      setPrices(initial);
      setDeliveryDays(
        existingQuote?.latestRevision?.deliveryDays ||
        existingQuote?.revisions?.[0]?.deliveryDays ||
        7
      );
      setNotes(
        existingQuote?.latestRevision?.notes ||
        existingQuote?.revisions?.[0]?.notes ||
        ''
      );
    }
  }, [isOpen, existingQuote, rfq]);

  if (!isOpen) return null;

  const handlePriceChange = (lineItemId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setPrices((prev) => ({
      ...prev,
      [lineItemId]: num,
    }));
  };

  // Real-time grand total computation for preview
  const calculatedGrandTotal = rfq.lineItems.reduce((acc, item) => {
    const p = prices[item.id] || 0;
    const q = Number(item.quantity) || 0;
    return acc + p * q;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side completeness check
    for (const item of rfq.lineItems) {
      if (!prices[item.id] || prices[item.id] <= 0) {
        setError(`Please enter a valid positive unit price for line item: "${item.name}"`);
        return;
      }
    }

    if (deliveryDays < 1) {
      setError('Delivery turnaround must be at least 1 day');
      return;
    }

    const payload = {
      deliveryDays,
      notes: notes.trim() || undefined,
      prices: rfq.lineItems.map((item) => ({
        rfqLineItemId: item.id,
        unitPrice: prices[item.id],
      })),
    };

    try {
      setIsSubmitting(true);
      if (isRevision) {
        await api.put(`/api/rfqs/${rfq.id}/quotes`, payload);
      } else {
        await api.post(`/api/rfqs/${rfq.id}/quotes`, payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to submit quote');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-2xl rounded-2xl p-6 bg-white border border-slate-200 shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <span className="text-xs font-semibold tracking-wider text-indigo-600 uppercase">
            {isRevision ? `Revise Quote (Rev #${(existingQuote?.currentRevisionNumber || 1) + 1})` : 'New Bid Submission'}
          </span>
          <h2 className="text-xl font-bold text-slate-900">{rfq.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prices are per unit. The server verifies and computes the total mathematically.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Line Items Pricing Table */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Line Item Pricing (INR)
            </label>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 w-36">Unit Price (₹)</th>
                    <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rfq.lineItems.map((item) => {
                    const price = prices[item.id] || 0;
                    const subtotal = price * Number(item.quantity);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                          {Number(item.quantity).toLocaleString()} {item.unit}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={prices[item.id] === 0 ? '' : prices[item.id]}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-right text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          ₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Delivery Time (Days)
              </label>
              <input
                type="number"
                min="1"
                required
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quotation Notes / Terms (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Ex-stock, freight included"
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm shadow-sm"
              />
            </div>
          </div>

          {/* Computed Grand Total Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">Estimated Grand Total (INR)</span>
              <div className="text-2xl font-bold text-slate-900 font-mono">
                ₹{calculatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-right text-xs text-slate-400">
              <span>{rfq.lineItems.length} line items covered</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || calculatedGrandTotal <= 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Bid...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isRevision ? 'Submit New Revision' : 'Submit Final Quote'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
