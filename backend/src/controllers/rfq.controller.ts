import { Request, Response, NextFunction } from 'express';
import { RfqService } from '../services/rfq.service';
import { createRfqSchema, updateRfqSchema, rfqQuerySchema } from '../validators/rfq.validator';
import { AppError } from '../middleware/error.middleware';

export class RfqController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const validated = createRfqSchema.parse(req.body);
      const rfq = await RfqService.createRfq(req.user.id, validated);

      res.status(201).json({
        data: rfq,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id } = req.params;
      const validated = updateRfqSchema.parse(req.body);
      const rfq = await RfqService.updateRfq(req.user.id, req.user.role, id, validated);

      res.status(200).json({
        data: rfq,
      });
    } catch (error) {
      next(error);
    }
  }

  static async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id } = req.params;
      const rfq = await RfqService.publishRfq(req.user.id, req.user.role, id);

      res.status(200).json({
        data: rfq,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id } = req.params;
      const rfq = await RfqService.getRfqById(req.user.id, req.user.role, id);

      res.status(200).json({
        data: rfq,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const query = rfqQuerySchema.parse(req.query);
      const result = await RfqService.listRfqs(req.user.id, req.user.role, query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
