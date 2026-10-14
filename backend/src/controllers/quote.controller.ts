import { Request, Response, NextFunction } from 'express';
import { QuoteService } from '../services/quote.service';
import { submitQuoteSchema, reviseQuoteSchema } from '../validators/quote.validator';
import { AppError } from '../middleware/error.middleware';

export class QuoteController {
  static async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id: rfqId } = req.params;
      const validated = submitQuoteSchema.parse(req.body);
      const result = await QuoteService.submitQuote(req.user.id, rfqId, validated);

      res.status(201).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async revise(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id: rfqId } = req.params;
      const validated = reviseQuoteSchema.parse(req.body);
      const result = await QuoteService.reviseQuote(req.user.id, rfqId, validated);

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id: rfqId } = req.params;
      const quote = await QuoteService.getVendorQuoteForRfq(req.user.id, rfqId);

      res.status(200).json({
        data: quote,
      });
    } catch (error: any) {
      // If no quote has been submitted yet by this vendor, respond with data: null (200 OK)
      // This represents an empty state, not a fatal server error
      if (error?.statusCode === 404 || error?.code === 'NOT_FOUND') {
        res.status(200).json({
          data: null,
        });
        return;
      }
      next(error);
    }
  }

  static async getRfqQuotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id: rfqId } = req.params;
      const quotes = await QuoteService.getQuotesForRfq(req.user.id, req.user.role, rfqId);

      res.status(200).json({
        data: quotes,
      });
    } catch (error) {
      next(error);
    }
  }
}
