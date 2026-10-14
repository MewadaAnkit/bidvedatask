import { Prisma, QuoteStatus, Role, EntityType, RfqStatus } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../middleware/error.middleware';
import { SubmitQuoteInput, ReviseQuoteInput } from '../validators/quote.validator';

export class QuoteService {
  /**
   * Submits a vendor's initial quote for a PUBLISHED RFQ.
   * Enforces server clock deadline check and atomic row lock.
   */
  static async submitQuote(vendorId: string, rfqId: string, input: SubmitQuoteInput) {
    return await prisma.$transaction(
      async (tx) => {
        // 1. Pessimistic row lock on RFQ to atomically verify status and deadline
        const lockedRfq = await tx.$queryRaw<
          Array<{ id: string; status: RfqStatus; deadline: Date; buyerId: string }>
        >`SELECT id, status, deadline, "buyerId" FROM rfqs WHERE id = ${rfqId} FOR UPDATE`;

        if (!lockedRfq || lockedRfq.length === 0) {
          throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
        }

        const rfq = lockedRfq[0];

        if (rfq.status !== RfqStatus.PUBLISHED) {
          throw new AppError(
            400,
            'RFQ_NOT_OPEN',
            `Cannot submit quote. RFQ status is ${rfq.status}. Quotes are only accepted on PUBLISHED RFQs.`
          );
        }

        // Server clock decides deadline, never client time
        const now = new Date();
        if (now > new Date(rfq.deadline)) {
          throw new AppError(
            400,
            'DEADLINE_PASSED',
            'The submission deadline for this RFQ has expired. No quotes can be accepted.'
          );
        }

        // 2. Fetch all RFQ line items and validate 100% item coverage inside transaction
        const lineItems = await tx.rFQLineItem.findMany({
          where: { rfqId },
        });

        if (lineItems.length === 0) {
          throw new AppError(400, 'BAD_REQUEST', 'This RFQ has no line items');
        }

        const lineItemMap = new Map(lineItems.map((li) => [li.id, li]));
        const providedIds = new Set(input.prices.map((p) => p.rfqLineItemId));

        // Check for missing items
        for (const li of lineItems) {
          if (!providedIds.has(li.id)) {
            throw new AppError(
              400,
              'INCOMPLETE_QUOTE',
              `Quote is missing price for line item: "${li.name}"`
            );
          }
        }

        // Check for unrecognized line item IDs
        for (const p of input.prices) {
          if (!lineItemMap.has(p.rfqLineItemId)) {
            throw new AppError(
              400,
              'INVALID_LINE_ITEM',
              `Line item ID ${p.rfqLineItemId} does not belong to this RFQ`
            );
          }
        }

        // 3. Server computes exact totals (never trust client amounts)
        let grandTotal = new Prisma.Decimal(0);
        const computedPrices: Array<{
          rfqLineItemId: string;
          unitPrice: Prisma.Decimal;
          lineTotal: Prisma.Decimal;
        }> = [];

        for (const priceInput of input.prices) {
          const lineItem = lineItemMap.get(priceInput.rfqLineItemId)!;
          const unitPrice = new Prisma.Decimal(priceInput.unitPrice);
          const lineTotal = unitPrice.mul(lineItem.quantity);
          grandTotal = grandTotal.add(lineTotal);

          computedPrices.push({
            rfqLineItemId: lineItem.id,
            unitPrice,
            lineTotal,
          });
        }

        // Check if vendor already submitted a quote for this RFQ
        const existingQuote = await tx.quote.findUnique({
          where: {
            rfqId_vendorId: { rfqId, vendorId },
          },
        });

        if (existingQuote) {
          // Graceful fallback: increment to next revision instead of throwing 409
          const nextRevisionNumber = existingQuote.currentRevisionNumber + 1;
          const newRevision = await tx.quoteRevision.create({
            data: {
              quoteId: existingQuote.id,
              revisionNumber: nextRevisionNumber,
              deliveryDays: input.deliveryDays,
              notes: input.notes || null,
              totalAmount: grandTotal,
              prices: {
                create: computedPrices,
              },
            },
            include: {
              prices: {
                include: {
                  rfqLineItem: true,
                },
              },
            },
          });

          const updatedQuote = await tx.quote.update({
            where: { id: existingQuote.id },
            data: {
              currentRevisionNumber: nextRevisionNumber,
              updatedAt: new Date(),
            },
          });

          return {
            ...updatedQuote,
            currentRevision: newRevision,
          };
        }

        // Create Quote master record
        const quote = await tx.quote.create({
          data: {
            rfqId,
            vendorId,
            status: QuoteStatus.SUBMITTED,
            currentRevisionNumber: 1,
          },
        });

        // Create Revision 1 record with computed total
        const revision = await tx.quoteRevision.create({
          data: {
            quoteId: quote.id,
            revisionNumber: 1,
            deliveryDays: input.deliveryDays,
            notes: input.notes || null,
            totalAmount: grandTotal,
            prices: {
              create: computedPrices,
            },
          },
          include: {
            prices: {
              include: {
                rfqLineItem: true,
              },
            },
          },
        });

        // Audit trail in status_history
        await tx.statusHistory.create({
          data: {
            changedById: vendorId,
            entityType: EntityType.QUOTE,
            entityId: quote.id,
            fromStatus: 'NONE',
            toStatus: QuoteStatus.SUBMITTED,
            reason: 'Initial quote submitted (Revision 1)',
          },
        });

        return {
          ...quote,
          currentRevision: revision,
        };
      },
      {
        maxWait: 10000,
        timeout: 25000,
      }
    );
  }

  /**
   * Revises an existing quote before the deadline.
   * Creates a new immutable revision row, updates master quote pointer.
   */
  static async reviseQuote(vendorId: string, rfqId: string, input: ReviseQuoteInput) {
    // 1. Line item validation & computation outside transaction
    const lineItems = await prisma.rFQLineItem.findMany({
      where: { rfqId },
    });

    const lineItemMap = new Map(lineItems.map((li) => [li.id, li]));
    const providedIds = new Set(input.prices.map((p) => p.rfqLineItemId));

    for (const li of lineItems) {
      if (!providedIds.has(li.id)) {
        throw new AppError(
          400,
          'INCOMPLETE_QUOTE',
          `Quote is missing price for line item: "${li.name}"`
        );
      }
    }

    for (const p of input.prices) {
      if (!lineItemMap.has(p.rfqLineItemId)) {
        throw new AppError(
          400,
          'INVALID_LINE_ITEM',
          `Line item ID ${p.rfqLineItemId} does not belong to this RFQ`
        );
      }
    }

    // 2. Server computes totals
    let grandTotal = new Prisma.Decimal(0);
    const computedPrices: Array<{
      rfqLineItemId: string;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }> = [];

    for (const priceInput of input.prices) {
      const lineItem = lineItemMap.get(priceInput.rfqLineItemId)!;
      const unitPrice = new Prisma.Decimal(priceInput.unitPrice);
      const lineTotal = unitPrice.mul(lineItem.quantity);
      grandTotal = grandTotal.add(lineTotal);

      computedPrices.push({
        rfqLineItemId: lineItem.id,
        unitPrice,
        lineTotal,
      });
    }

    return await prisma.$transaction(
      async (tx) => {
        // 1. Lock RFQ and check deadline
        const lockedRfq = await tx.$queryRaw<
          Array<{ id: string; status: RfqStatus; deadline: Date }>
        >`SELECT id, status, deadline FROM rfqs WHERE id = ${rfqId} FOR UPDATE`;

        if (!lockedRfq || lockedRfq.length === 0) {
          throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
        }

        const rfq = lockedRfq[0];

        if (rfq.status !== RfqStatus.PUBLISHED) {
          throw new AppError(
            400,
            'RFQ_NOT_OPEN',
            `Cannot revise quote. RFQ status is ${rfq.status}.`
          );
        }

        const now = new Date();
        if (now > new Date(rfq.deadline)) {
          throw new AppError(
            400,
            'DEADLINE_PASSED',
            'The submission deadline for this RFQ has expired. No revisions can be accepted.'
          );
        }

        // 2. Lock and fetch existing quote for this vendor
        const existingQuotes = await tx.$queryRaw<
          Array<{ id: string; status: QuoteStatus; currentRevisionNumber: number }>
        >`SELECT id, status, "currentRevisionNumber" FROM quotes WHERE "rfqId" = ${rfqId} AND "vendorId" = ${vendorId} FOR UPDATE`;

        if (!existingQuotes || existingQuotes.length === 0) {
          // Graceful fallback: If no prior quote exists, create initial Quote and Revision 1
          const quote = await tx.quote.create({
            data: {
              rfqId,
              vendorId,
              status: QuoteStatus.SUBMITTED,
              currentRevisionNumber: 1,
            },
          });

          const revision = await tx.quoteRevision.create({
            data: {
              quoteId: quote.id,
              revisionNumber: 1,
              deliveryDays: input.deliveryDays,
              notes: input.notes || null,
              totalAmount: grandTotal,
              prices: {
                create: computedPrices,
              },
            },
            include: {
              prices: {
                include: {
                  rfqLineItem: true,
                },
              },
            },
          });

          await tx.statusHistory.create({
            data: {
              changedById: vendorId,
              entityType: EntityType.QUOTE,
              entityId: quote.id,
              fromStatus: 'NONE',
              toStatus: QuoteStatus.SUBMITTED,
              reason: 'Initial quote submitted (Revision 1)',
            },
          });

          return {
            ...quote,
            currentRevision: revision,
          };
        }

        const existingQuote = existingQuotes[0];

        if (existingQuote.status === QuoteStatus.ACCEPTED || existingQuote.status === QuoteStatus.REJECTED) {
          throw new AppError(
            400,
            'INVALID_STATUS',
            `Cannot revise a quote that is already ${existingQuote.status}`
          );
        }

        // 3. Increment revision number
        const nextRevisionNumber = existingQuote.currentRevisionNumber + 1;

        // 4. Insert new immutable revision row
        const newRevision = await tx.quoteRevision.create({
          data: {
            quoteId: existingQuote.id,
            revisionNumber: nextRevisionNumber,
            deliveryDays: input.deliveryDays,
            notes: input.notes || null,
            totalAmount: grandTotal,
            prices: {
              create: computedPrices,
            },
          },
          include: {
            prices: {
              include: {
                rfqLineItem: true,
              },
            },
          },
        });

        // 5. Update master quote pointer
        const updatedQuote = await tx.quote.update({
          where: { id: existingQuote.id },
          data: {
            currentRevisionNumber: nextRevisionNumber,
            updatedAt: new Date(),
          },
        });

        // 6. Audit trail for revised quote
        await tx.statusHistory.create({
          data: {
            changedById: vendorId,
            entityType: EntityType.QUOTE,
            entityId: existingQuote.id,
            fromStatus: existingQuote.status,
            toStatus: existingQuote.status,
            reason: `Quote updated with Revision ${nextRevisionNumber}`,
          },
        });

        return {
          ...updatedQuote,
          currentRevision: newRevision,
        };
      },
      {
        maxWait: 10000,
        timeout: 25000,
      }
    );
  }

  /**
   * Vendor views their own quote and full revision history.
   * Strictly filtered by vendorId (sealed bid privacy).
   */
  static async getVendorQuoteForRfq(vendorId: string, rfqId: string) {
    const quote = await prisma.quote.findUnique({
      where: {
        rfqId_vendorId: { rfqId, vendorId },
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
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

    if (!quote) {
      throw new AppError(404, 'NOT_FOUND', 'No quote submitted for this RFQ');
    }

    return quote;
  }

  /**
   * Buyer or Admin retrieves all submitted quotes for an RFQ.
   * Only the owning Buyer (or Admin) can view.
   * Returns each quote paired with its LATEST revision.
   */
  static async getQuotesForRfq(userId: string, userRole: Role, rfqId: string) {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    if (userRole === Role.BUYER && rfq.buyerId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    const quotes = await prisma.quote.findMany({
      where: { rfqId },
      include: {
        vendor: {
          select: { id: true, name: true, email: true },
        },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1, // Latest revision only for buyer evaluation
          include: {
            prices: {
              include: {
                rfqLineItem: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format so each quote has a top-level `latestRevision`
    return quotes.map((q) => ({
      id: q.id,
      rfqId: q.rfqId,
      vendorId: q.vendorId,
      vendor: q.vendor,
      status: q.status,
      currentRevisionNumber: q.currentRevisionNumber,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      latestRevision: q.revisions[0] || null,
    }));
  }
}
