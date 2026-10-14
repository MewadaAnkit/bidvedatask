import { QuoteStatus, RfqStatus, Role, EntityType } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../middleware/error.middleware';
import { AwardRfqInput, ComparisonQueryParams } from '../validators/award.validator';

export class AwardService {
  /**
   * Generates a side-by-side matrix comparison of all submitted quotes
   * for a given RFQ, mapped per line item and sortable by price/delivery.
   */
  static async getComparison(
    userId: string,
    userRole: Role,
    rfqId: string,
    params: ComparisonQueryParams
  ) {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        lineItems: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!rfq) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    if (userRole === Role.BUYER && rfq.buyerId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found'); // Sealed resource protection
    }

    // Fetch all quotes for this RFQ with vendor and latest revision
    const quotes = await prisma.quote.findMany({
      where: { rfqId },
      include: {
        vendor: {
          select: { id: true, name: true, email: true },
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
    });

    // Map into comparison matrix format
    const formattedQuotes = quotes.map((q) => {
      const latestRev = q.revisions[0];
      const pricesMap: Record<string, { unitPrice: string; lineTotal: string }> = {};

      if (latestRev) {
        for (const p of latestRev.prices) {
          pricesMap[p.rfqLineItemId] = {
            unitPrice: p.unitPrice.toString(),
            lineTotal: p.lineTotal.toString(),
          };
        }
      }

      return {
        quoteId: q.id,
        vendorId: q.vendorId,
        vendorName: q.vendor.name,
        vendorEmail: q.vendor.email,
        status: q.status,
        currentRevisionNumber: q.currentRevisionNumber,
        deliveryDays: latestRev?.deliveryDays ?? 0,
        totalAmount: latestRev?.totalAmount ? Number(latestRev.totalAmount) : 0,
        notes: latestRev?.notes ?? null,
        itemPrices: pricesMap,
      };
    });

    // Sort quotes according to requested query params
    const { sortBy, sortOrder } = params;
    formattedQuotes.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'totalAmount') {
        comparison = a.totalAmount - b.totalAmount;
      } else if (sortBy === 'deliveryDays') {
        comparison = a.deliveryDays - b.deliveryDays;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Determine summary benchmarks
    const lowestTotal =
      formattedQuotes.length > 0
        ? Math.min(...formattedQuotes.map((q) => q.totalAmount))
        : null;
    const fastestDelivery =
      formattedQuotes.length > 0
        ? Math.min(...formattedQuotes.map((q) => q.deliveryDays))
        : null;

    return {
      rfq: {
        id: rfq.id,
        title: rfq.title,
        category: rfq.category,
        deliveryLocation: rfq.deliveryLocation,
        budget: rfq.budget ? rfq.budget.toString() : null,
        deadline: rfq.deadline,
        status: rfq.status,
        awardedQuoteId: rfq.awardedQuoteId,
      },
      lineItems: rfq.lineItems.map((li) => ({
        id: li.id,
        name: li.name,
        quantity: li.quantity.toString(),
        unit: li.unit,
      })),
      quotes: formattedQuotes,
      benchmarks: {
        lowestTotal,
        fastestDelivery,
        totalBids: formattedQuotes.length,
      },
    };
  }

  /**
   * Toggles shortlisting on a vendor quote.
   */
  static async toggleShortlist(userId: string, userRole: Role, rfqId: string, quoteId: string) {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    if (userRole === Role.BUYER && rfq.buyerId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    if (rfq.status === RfqStatus.AWARDED) {
      throw new AppError(400, 'INVALID_STATUS', 'Cannot modify shortlisting on an already AWARDED RFQ');
    }

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote || quote.rfqId !== rfqId) {
      throw new AppError(404, 'NOT_FOUND', 'Quote not found on this RFQ');
    }

    const newStatus =
      quote.status === QuoteStatus.SHORTLISTED ? QuoteStatus.SUBMITTED : QuoteStatus.SHORTLISTED;

    const updated = await prisma.$transaction(
      async (tx) => {
        const q = await tx.quote.update({
          where: { id: quoteId },
          data: { status: newStatus },
        });

        await tx.statusHistory.create({
          data: {
            changedById: userId,
            entityType: EntityType.QUOTE,
            entityId: quoteId,
            fromStatus: quote.status,
            toStatus: newStatus,
            reason: newStatus === QuoteStatus.SHORTLISTED ? 'Buyer shortlisted quote' : 'Buyer un-shortlisted quote',
          },
        });

        return q;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return updated;
  }

  /**
   * Atomically awards an RFQ to exactly one chosen quote in a single ACID transaction.
   * Uses row-level locks (SELECT ... FOR UPDATE) to guarantee zero race conditions.
   */
  static async awardRfq(
    userId: string,
    userRole: Role,
    rfqId: string,
    input: AwardRfqInput
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Lock the RFQ row
      const lockedRfq = await tx.$queryRaw<
        Array<{
          id: string;
          status: RfqStatus;
          deadline: Date;
          buyerId: string;
          awardedQuoteId: string | null;
        }>
      >`SELECT id, status, deadline, "buyerId", "awardedQuoteId" FROM rfqs WHERE id = ${rfqId} FOR UPDATE`;

      if (!lockedRfq || lockedRfq.length === 0) {
        throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
      }

      const rfq = lockedRfq[0];

      // Ownership check (only owning buyer or admin can award)
      if (userRole === Role.BUYER && rfq.buyerId !== userId) {
        throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
      }

      // Invariant 1: Prevent double-awarding
      if (rfq.status === RfqStatus.AWARDED || rfq.awardedQuoteId) {
        throw new AppError(400, 'ALREADY_AWARDED', 'This RFQ has already been awarded and cannot be awarded again');
      }

      // Invariant 2: Block awarding before deadline has passed
      const now = new Date();
      if (now < new Date(rfq.deadline)) {
        const d = new Date(rfq.deadline);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const formattedDeadline = `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;

        throw new AppError(
          400,
          'DEADLINE_NOT_PASSED',
          `Cannot award RFQ before the submission deadline has elapsed. Vendor bidding is active until ${formattedDeadline}. Please wait until the deadline closes to award the contract.`
        );
      }

      // 2. Lock all quotes for this RFQ
      const lockedQuotes = await tx.$queryRaw<
        Array<{
          id: string;
          status: QuoteStatus;
          vendorId: string;
        }>
      >`SELECT id, status, "vendorId" FROM quotes WHERE "rfqId" = ${rfqId} FOR UPDATE`;

      // Invariant 3: Validate the chosen quote exists on THIS RFQ
      const chosenQuote = lockedQuotes.find((q) => q.id === input.quoteId);
      if (!chosenQuote) {
        throw new AppError(
          400,
          'INVALID_QUOTE',
          'The specified quote does not exist or does not belong to this RFQ'
        );
      }

      // 3. Update chosen quote to ACCEPTED
      await tx.quote.update({
        where: { id: chosenQuote.id },
        data: { status: QuoteStatus.ACCEPTED },
      });

      // 4. Update all other quotes on this RFQ to REJECTED
      const otherQuotes = lockedQuotes.filter((q) => q.id !== input.quoteId);
      if (otherQuotes.length > 0) {
        await tx.quote.updateMany({
          where: {
            rfqId,
            id: { not: input.quoteId },
          },
          data: { status: QuoteStatus.REJECTED },
        });
      }

      // 5. Update RFQ status to AWARDED and set awardedQuoteId
      const updatedRfq = await tx.rFQ.update({
        where: { id: rfqId },
        data: {
          status: RfqStatus.AWARDED,
          awardedQuoteId: input.quoteId,
        },
        include: {
          lineItems: true,
          awardedQuote: {
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
      });

      // 6. Record status history rows
      // A) RFQ status change
      await tx.statusHistory.create({
        data: {
          changedById: userId,
          entityType: EntityType.RFQ,
          entityId: rfqId,
          fromStatus: rfq.status,
          toStatus: RfqStatus.AWARDED,
          reason: input.reason || 'RFQ awarded to winning vendor quote',
        },
      });

      // B) Winning quote status change
      await tx.statusHistory.create({
        data: {
          changedById: userId,
          entityType: EntityType.QUOTE,
          entityId: chosenQuote.id,
          fromStatus: chosenQuote.status,
          toStatus: QuoteStatus.ACCEPTED,
          reason: 'Quote accepted and awarded',
        },
      });

      // C) Losing quotes status changes
      for (const other of otherQuotes) {
        await tx.statusHistory.create({
          data: {
            changedById: userId,
            entityType: EntityType.QUOTE,
            entityId: other.id,
            fromStatus: other.status,
            toStatus: QuoteStatus.REJECTED,
            reason: 'Quote rejected due to competitor quote being awarded',
          },
        });
      }

      return updatedRfq;
    },
    {
      maxWait: 10000,
      timeout: 25000,
    });
  }

  /**
   * Retrieves complete status change audit trail for an RFQ and its child quotes.
   */
  static async getStatusHistory(userId: string, userRole: Role, rfqId: string) {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        buyer: {
          select: { id: true, name: true, email: true },
        },
        quotes: {
          include: {
            vendor: {
              select: { id: true, name: true, email: true, role: true },
            },
            revisions: {
              orderBy: { revisionNumber: 'desc' },
              take: 1,
              select: { revisionNumber: true, totalAmount: true, deliveryDays: true },
            },
          },
        },
      },
    });

    if (!rfq) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    if (userRole === Role.BUYER && rfq.buyerId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    const quoteIds = rfq.quotes.map((q) => q.id);

    // Retrieve all status history rows for this RFQ and its quotes
    const history = await prisma.statusHistory.findMany({
      where: {
        OR: [
          { entityType: EntityType.RFQ, entityId: rfqId },
          { entityType: EntityType.QUOTE, entityId: { in: quoteIds } },
        ],
      },
      include: {
        changedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const quoteMap = new Map(
      rfq.quotes.map((q) => {
        const latestRev = q.revisions[0];
        return [
          q.id,
          {
            id: q.id,
            vendorId: q.vendorId,
            vendorName: q.vendor.name,
            vendorEmail: q.vendor.email,
            currentRevisionNumber: q.currentRevisionNumber,
            totalAmount: latestRev ? Number(latestRev.totalAmount) : null,
            deliveryDays: latestRev ? latestRev.deliveryDays : null,
          },
        ];
      })
    );

    return history.map((item) => {
      const isQuote = item.entityType === EntityType.QUOTE;
      const targetQuote = isQuote ? quoteMap.get(item.entityId) || null : null;
      return {
        ...item,
        targetQuote,
        targetRfq: {
          id: rfq.id,
          title: rfq.title,
          buyerName: rfq.buyer?.name,
          buyerEmail: rfq.buyer?.email,
        },
      };
    });
  }
}
