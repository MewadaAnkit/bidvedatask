export type Role = 'BUYER' | 'VENDOR' | 'ADMIN';

export type RfqStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'AWARDED';

export type QuoteStatus = 'SUBMITTED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface RFQLineItem {
  id: string;
  rfqId: string;
  name: string;
  quantity: string | number;
  unit: string;
}

export interface RFQ {
  id: string;
  buyerId: string;
  buyer?: { id: string; name: string; email: string };
  title: string;
  description: string;
  category: string;
  deliveryLocation: string;
  budget: string | null;
  deadline: string;
  status: RfqStatus;
  awardedQuoteId: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: RFQLineItem[];
  _count?: { quotes: number };
}

export interface QuoteRevisionPrice {
  id: string;
  rfqLineItemId: string;
  unitPrice: string | number;
  lineTotal: string | number;
  rfqLineItem?: RFQLineItem;
}

export interface QuoteRevision {
  id: string;
  quoteId: string;
  revisionNumber: number;
  deliveryDays: number;
  notes: string | null;
  totalAmount: string | number;
  createdAt: string;
  prices: QuoteRevisionPrice[];
}

export interface Quote {
  id: string;
  rfqId: string;
  vendorId: string;
  vendor?: { id: string; name: string; email: string };
  status: QuoteStatus;
  currentRevisionNumber: number;
  createdAt: string;
  updatedAt: string;
  revisions?: QuoteRevision[];
  latestRevision?: QuoteRevision | null;
}

export interface Attachment {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface StatusHistoryItem {
  id: string;
  changedById: string;
  changedBy?: { id: string; name: string; email: string; role: Role };
  entityType: 'RFQ' | 'QUOTE';
  entityId: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  createdAt: string;
  targetQuote?: {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorEmail: string;
    currentRevisionNumber?: number;
    totalAmount?: number | null;
    deliveryDays?: number | null;
    rfqId?: string;
    rfqTitle?: string;
  } | null;
  targetRfq?: {
    id: string;
    title: string;
    buyerName?: string;
    buyerEmail?: string;
  } | null;
}

export interface ComparisonQuote {
  quoteId: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  status: QuoteStatus;
  currentRevisionNumber: number;
  deliveryDays: number;
  totalAmount: number;
  notes: string | null;
  itemPrices: Record<string, { unitPrice: string; lineTotal: string }>;
}

export interface ComparisonData {
  rfq: {
    id: string;
    title: string;
    category: string;
    deliveryLocation: string;
    budget: string | null;
    deadline: string;
    status: RfqStatus;
    awardedQuoteId: string | null;
  };
  lineItems: Array<{
    id: string;
    name: string;
    quantity: string;
    unit: string;
  }>;
  quotes: ComparisonQuote[];
  benchmarks: {
    lowestTotal: number | null;
    fastestDelivery: number | null;
    totalBids: number;
  };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  _count?: {
    rfqs: number;
    quotes: number;
    attachments?: number;
  };
}

export interface PlatformStats {
  users: {
    total: number;
    buyers: number;
    vendors: number;
    admins: number;
  };
  rfqs: {
    total: number;
    draft: number;
    published: number;
    closed: number;
    awarded: number;
    totalBudget: number;
  };
  quotes: {
    total: number;
    accepted: number;
    shortlisted: number;
    rejected: number;
    submitted: number;
    totalAwardedSpend: number;
  };
  attachments: {
    total: number;
  };
}

export interface AdminQuote {
  id: string;
  rfqId: string;
  vendorId: string;
  status: QuoteStatus;
  currentRevisionNumber: number;
  createdAt: string;
  updatedAt: string;
  rfq: {
    id: string;
    title: string;
    category: string;
    status: RfqStatus;
    deadline: string;
    budget: string | null;
    buyer: { id: string; name: string; email: string };
  };
  vendor: {
    id: string;
    name: string;
    email: string;
  };
  revisions: Array<{
    id: string;
    revisionNumber: number;
    totalAmount: string | number;
    deliveryDays: number;
    notes: string | null;
    createdAt: string;
  }>;
}

export interface VendorBid {
  id: string;
  rfqId: string;
  status: QuoteStatus;
  currentRevisionNumber: number;
  createdAt: string;
  updatedAt: string;
  rfq: {
    id: string;
    title: string;
    status: RfqStatus;
    category?: string;
    deliveryLocation?: string;
    deadline: string;
    budget: string | null;
    buyer: { id: string; name: string; email: string };
    _count?: { lineItems: number; quotes: number };
  };
  latestRevision: {
    id: string;
    revisionNumber: number;
    deliveryDays: number;
    notes: string | null;
    totalAmount: string | number;
    createdAt: string;
    prices?: Array<{
      id: string;
      rfqLineItemId: string;
      unitPrice: string | number;
      lineTotal: string | number;
      rfqLineItem?: RFQLineItem;
    }>;
  } | null;
}

export interface VendorStats {
  totalBids: number;
  activeBids: number;
  wonBids: number;
  wonValue: number;
  winRate: number;
  openRfqsCount: number;
}

export interface BuyerStats {
  totalRfqs: number;
  draftRfqs: number;
  publishedRfqs: number;
  closedRfqs: number;
  awardedRfqs: number;
  totalQuotesReceived: number;
  totalAwardedSpend: number;
  pendingEvaluationCount: number;
}

export interface BuyerEvaluation {
  id: string;
  title: string;
  status: RfqStatus;
  deadline: string;
  budget: string | null;
  category: string;
  quoteCount: number;
  lineItemCount: number;
  lowestBid: number | null;
  highestBid: number | null;
  hasAwardedQuote: boolean;
}

