import { prisma } from '../db';

export class VendorService {
  /**
   * Returns all bids/quotations submitted by this vendor across all RFQs.
   */
  static async getMyBids(vendorId: string) {
    const quotes = await prisma.quote.findMany({
      where: { vendorId },
      include: {
        rfq: {
          select: {
            id: true,
            title: true,
            status: true,
            category: true,
            deliveryLocation: true,
            budget: true,
            deadline: true,
            buyer: {
              select: { id: true, name: true, email: true },
            },
            _count: {
              select: { lineItems: true, quotes: true },
            },
          },
        },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          include: {
            prices: {
              include: {
                rfqLineItem: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return quotes.map((q) => ({
      id: q.id,
      rfqId: q.rfqId,
      status: q.status,
      currentRevisionNumber: q.currentRevisionNumber,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      rfq: q.rfq,
      latestRevision: q.revisions[0] || null,
    }));
  }

  /**
   * Returns executive KPIs for the vendor dashboard.
   */
  static async getVendorStats(vendorId: string) {
    const quotes = await prisma.quote.findMany({
      where: { vendorId },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
        },
      },
    });

    const totalBids = quotes.length;
    const wonQuotes = quotes.filter((q) => q.status === 'ACCEPTED');
    const wonBids = wonQuotes.length;
    const activeBids = quotes.filter(
      (q) => q.status === 'SUBMITTED' || q.status === 'SHORTLISTED'
    ).length;

    const wonValue = wonQuotes.reduce((acc, q) => {
      const rev = q.revisions[0];
      return acc + (rev ? Number(rev.totalAmount) : 0);
    }, 0);

    const openRfqsCount = await prisma.rFQ.count({
      where: {
        status: 'PUBLISHED',
        deadline: { gt: new Date() },
      },
    });

    return {
      totalBids,
      activeBids,
      wonBids,
      wonValue,
      winRate: totalBids > 0 ? Math.round((wonBids / totalBids) * 100) : 0,
      openRfqsCount,
    };
  }
}
