import { prisma } from '../db';
import { RfqStatus } from '@prisma/client';

export class BuyerService {
  /**
   * Executive KPIs for the Buyer's procurement dashboard.
   */
  static async getBuyerStats(buyerId: string) {
    const rfqs = await prisma.rFQ.findMany({
      where: { buyerId },
      include: {
        _count: {
          select: { quotes: true },
        },
        awardedQuote: {
          include: {
            revisions: {
              orderBy: { revisionNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const totalRfqs = rfqs.length;
    const draftRfqs = rfqs.filter((r) => r.status === RfqStatus.DRAFT).length;
    const publishedRfqs = rfqs.filter((r) => r.status === RfqStatus.PUBLISHED).length;
    const closedRfqs = rfqs.filter((r) => r.status === RfqStatus.CLOSED).length;
    const awardedRfqs = rfqs.filter((r) => r.status === RfqStatus.AWARDED).length;

    const totalQuotesReceived = rfqs.reduce((acc, r) => acc + r._count.quotes, 0);

    const totalAwardedSpend = rfqs.reduce((acc, r) => {
      if (r.awardedQuote && r.awardedQuote.revisions.length > 0) {
        return acc + Number(r.awardedQuote.revisions[0].totalAmount);
      }
      return acc;
    }, 0);

    // RFQs that have quotes and are pending evaluation/award
    const pendingEvaluationCount = rfqs.filter(
      (r) => (r.status === RfqStatus.PUBLISHED || r.status === RfqStatus.CLOSED) && r._count.quotes > 0
    ).length;

    return {
      totalRfqs,
      draftRfqs,
      publishedRfqs,
      closedRfqs,
      awardedRfqs,
      totalQuotesReceived,
      totalAwardedSpend,
      pendingEvaluationCount,
    };
  }

  /**
   * Returns RFQs that have received quotes and are ready for comparison / evaluation.
   */
  static async getEvaluationRfqs(buyerId: string) {
    const rfqs = await prisma.rFQ.findMany({
      where: {
        buyerId,
        quotes: { some: {} },
      },
      include: {
        _count: {
          select: { quotes: true, lineItems: true },
        },
        quotes: {
          include: {
            vendor: {
              select: { id: true, name: true, email: true },
            },
            revisions: {
              orderBy: { revisionNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rfqs.map((r) => {
      const quoteAmounts = r.quotes
        .map((q) => (q.revisions[0] ? Number(q.revisions[0].totalAmount) : null))
        .filter((amt): amt is number => amt !== null);

      const lowestBid = quoteAmounts.length > 0 ? Math.min(...quoteAmounts) : null;
      const highestBid = quoteAmounts.length > 0 ? Math.max(...quoteAmounts) : null;

      return {
        id: r.id,
        title: r.title,
        status: r.status,
        deadline: r.deadline,
        budget: r.budget,
        category: r.category,
        quoteCount: r._count.quotes,
        lineItemCount: r._count.lineItems,
        lowestBid,
        highestBid,
        hasAwardedQuote: Boolean(r.awardedQuoteId),
      };
    });
  }
}
