import { RfqService } from '../src/services/rfq.service';
import { QuoteService } from '../src/services/quote.service';
import { AwardService } from '../src/services/award.service';
import { prisma } from '../src/db';
import { Role, RfqStatus, QuoteStatus } from '@prisma/client';
import { AppError } from '../src/middleware/error.middleware';

describe('Core Business Logic & Invariant Unit Checks', () => {
  describe('RFQ Lifecycle & Scoping (Tests #6 & #11)', () => {
    it('computes effective status as CLOSED lazily if deadline passed', async () => {
      const pastDeadlineRfq = {
        id: 'mock-rfq-1',
        buyerId: 'buyer-1',
        status: RfqStatus.PUBLISHED,
        deadline: new Date(Date.now() - 10000), // In the past
      };

      // Mock prisma call
      const spyTx = jest.spyOn(prisma, '$transaction').mockResolvedValueOnce([] as any);

      const resolved = await RfqService.resolveEffectiveStatus(pastDeadlineRfq);
      expect(resolved.status).toBe(RfqStatus.CLOSED);
      spyTx.mockRestore();
    });

    it('throws 404 if Buyer attempts to access another Buyer RFQ (Test #6)', async () => {
      jest.spyOn(prisma.rFQ, 'findUnique').mockResolvedValueOnce({
        id: 'rfq-owned-by-buyer-2',
        buyerId: 'buyer-2',
        status: RfqStatus.PUBLISHED,
        deadline: new Date(Date.now() + 100000),
      } as any);

      await expect(
        RfqService.getRfqById('buyer-1', Role.BUYER, 'rfq-owned-by-buyer-2')
      ).rejects.toThrow(AppError);
    });

    it('throws 404 if Vendor attempts to access a DRAFT RFQ (Test #11)', async () => {
      jest.spyOn(prisma.rFQ, 'findUnique').mockResolvedValueOnce({
        id: 'draft-rfq',
        buyerId: 'buyer-1',
        status: RfqStatus.DRAFT,
        deadline: new Date(Date.now() + 100000),
      } as any);

      await expect(
        RfqService.getRfqById('vendor-1', Role.VENDOR, 'draft-rfq')
      ).rejects.toThrow(AppError);
    });
  });

  describe('Quote Invariants (Tests #1, #2, #3, #4, #9)', () => {
    it('throws 404 when vendor queries another vendor quote (Sealed Bids - Test #4)', async () => {
      jest.spyOn(prisma.quote, 'findUnique').mockResolvedValueOnce(null);

      await expect(
        QuoteService.getVendorQuoteForRfq('vendor-1', 'rfq-1')
      ).rejects.toThrow(AppError);
    });

    it('rejects quote submission when deadline has passed (Test #3)', async () => {
      const mockTx = {
        $queryRaw: jest.fn().mockResolvedValueOnce([
          {
            id: 'rfq-1',
            status: RfqStatus.PUBLISHED,
            deadline: new Date(Date.now() - 50000), // Elapsed deadline
            buyerId: 'buyer-1',
          },
        ]),
      };

      jest.spyOn(prisma, '$transaction').mockImplementationOnce(async (cb: any) => cb(mockTx));

      await expect(
        QuoteService.submitQuote('vendor-1', 'rfq-1', {
          deliveryDays: 5,
          prices: [{ rfqLineItemId: '00000000-0000-0000-0000-000000000001', unitPrice: 10 }],
        })
      ).rejects.toThrow('The submission deadline for this RFQ has expired');
    });

    it('rejects quote submission if any line item is omitted (Test #9)', async () => {
      const mockTx = {
        $queryRaw: jest.fn().mockResolvedValueOnce([
          {
            id: 'rfq-1',
            status: RfqStatus.PUBLISHED,
            deadline: new Date(Date.now() + 50000),
            buyerId: 'buyer-1',
          },
        ]),
        quote: { findUnique: jest.fn().mockResolvedValueOnce(null) },
        rFQLineItem: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'item-1', name: 'Item 1', quantity: '10' },
            { id: 'item-2', name: 'Item 2', quantity: '20' }, // Missing in quote!
          ]),
        },
      };

      jest.spyOn(prisma, '$transaction').mockImplementationOnce(async (cb: any) => cb(mockTx));

      await expect(
        QuoteService.submitQuote('vendor-1', 'rfq-1', {
          deliveryDays: 5,
          prices: [{ rfqLineItemId: 'item-1', unitPrice: 100 }], // only item-1 provided
        })
      ).rejects.toThrow('Quote is missing price for line item: "Item 2"');
    });
  });

  describe('Award Invariants (Tests #7 & #8)', () => {
    it('blocks awarding before deadline has elapsed (Test #8)', async () => {
      const mockTx = {
        $queryRaw: jest.fn().mockResolvedValueOnce([
          {
            id: 'rfq-1',
            status: RfqStatus.PUBLISHED,
            deadline: new Date(Date.now() + 100000), // Deadline STILL in future
            buyerId: 'buyer-1',
            awardedQuoteId: null,
          },
        ]),
      };

      jest.spyOn(prisma, '$transaction').mockImplementationOnce(async (cb: any) => cb(mockTx));

      await expect(
        AwardService.awardRfq('buyer-1', Role.BUYER, 'rfq-1', {
          quoteId: 'quote-1',
        })
      ).rejects.toThrow('Cannot award RFQ before the submission deadline has elapsed');
    });

    it('blocks double-awarding an already AWARDED RFQ (Test #8)', async () => {
      const mockTx = {
        $queryRaw: jest.fn().mockResolvedValueOnce([
          {
            id: 'rfq-1',
            status: RfqStatus.AWARDED, // Already awarded!
            deadline: new Date(Date.now() - 100000),
            buyerId: 'buyer-1',
            awardedQuoteId: 'quote-1',
          },
        ]),
      };

      jest.spyOn(prisma, '$transaction').mockImplementationOnce(async (cb: any) => cb(mockTx));

      await expect(
        AwardService.awardRfq('buyer-1', Role.BUYER, 'rfq-1', {
          quoteId: 'quote-2',
        })
      ).rejects.toThrow('This RFQ has already been awarded and cannot be awarded again');
    });

    it('blocks awarding a quote that does not belong to this RFQ (Test #8)', async () => {
      const mockTx = {
        $queryRaw: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'rfq-1',
              status: RfqStatus.PUBLISHED,
              deadline: new Date(Date.now() - 100000), // Expired
              buyerId: 'buyer-1',
              awardedQuoteId: null,
            },
          ])
          .mockResolvedValueOnce([
            { id: 'quote-legit', status: QuoteStatus.SUBMITTED, vendorId: 'vendor-1' },
          ]),
      };

      jest.spyOn(prisma, '$transaction').mockImplementationOnce(async (cb: any) => cb(mockTx));

      await expect(
        AwardService.awardRfq('buyer-1', Role.BUYER, 'rfq-1', {
          quoteId: 'quote-from-another-rfq',
        })
      ).rejects.toThrow('The specified quote does not exist or does not belong to this RFQ');
    });
  });
});
