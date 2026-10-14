import { Request, Response, NextFunction } from 'express';
import { VendorService } from '../services/vendor.service';
import { AppError } from '../middleware/error.middleware';

export class VendorController {
  static async getMyBids(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const bids = await VendorService.getMyBids(req.user.id);
      res.status(200).json({ data: bids });
    } catch (error) {
      next(error);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const stats = await VendorService.getVendorStats(req.user.id);
      res.status(200).json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
}
