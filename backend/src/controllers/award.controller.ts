import { Request, Response, NextFunction } from 'express';
import { AwardService } from '../services/award.service';
import { awardRfqSchema, comparisonQuerySchema } from '../validators/award.validator';
import { AppError } from '../middleware/error.middleware';

export class AwardController {
  static async getComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id: rfqId } = req.params;
      const query = comparisonQuerySchema.parse(req.query);
      const comparison = await AwardService.getComparison(req.user.id, req.user.role, rfqId, query);

      res.status(200).json({
        data: comparison,
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleShortlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id: rfqId, quoteId } = req.params;
      const updatedQuote = await AwardService.toggleShortlist(req.user.id, req.user.role, rfqId, quoteId);

      res.status(200).json({
        data: updatedQuote,
      });
    } catch (error) {
      next(error);
    }
  }

  static async award(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id: rfqId } = req.params;
      const validated = awardRfqSchema.parse(req.body);
      const result = await AwardService.awardRfq(req.user.id, req.user.role, rfqId, validated);

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStatusHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id: rfqId } = req.params;
      const history = await AwardService.getStatusHistory(req.user.id, req.user.role, rfqId);

      res.status(200).json({
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}
