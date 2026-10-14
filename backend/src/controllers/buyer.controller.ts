import { Request, Response, NextFunction } from 'express';
import { BuyerService } from '../services/buyer.service';
import { AppError } from '../middleware/error.middleware';

export class BuyerController {
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const stats = await BuyerService.getBuyerStats(req.user.id);
      res.status(200).json({ data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async getEvaluations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const evals = await BuyerService.getEvaluationRfqs(req.user.id);
      res.status(200).json({ data: evals });
    } catch (error) {
      next(error);
    }
  }
}
