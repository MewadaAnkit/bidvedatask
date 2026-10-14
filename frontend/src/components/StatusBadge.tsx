import React from 'react';
import { RfqStatus, QuoteStatus } from '../types';

interface StatusBadgeProps {
  status: RfqStatus | QuoteStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStyle = (s: string) => {
    switch (s) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PUBLISHED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CLOSED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'AWARDED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SUBMITTED':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'SHORTLISTED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-wide uppercase ${sizeClasses} ${getStyle(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75" />
      {status}
    </span>
  );
};
