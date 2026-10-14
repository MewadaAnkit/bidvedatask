import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { adminCreateUserSchema, adminUpdateUserSchema } from '../validators/admin.validator';
import { AppError } from '../middleware/error.middleware';
import { Role, QuoteStatus } from '@prisma/client';

export class AdminController {
  static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, role, page, limit } = req.query;

      const result = await AdminService.listUsers({
        search: search as string | undefined,
        role: role ? (role as Role) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.status(200).json({
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = adminCreateUserSchema.parse(req.body);
      const user = await AdminService.createUser(validated);

      res.status(201).json({
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validated = adminUpdateUserSchema.parse(req.body);
      const user = await AdminService.updateUser(id, validated);

      res.status(200).json({
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id } = req.params;
      const result = await AdminService.deleteUser(req.user.id, id);

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AdminService.getPlatformStats();

      res.status(200).json({
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listQuotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status, page, limit } = req.query;

      const result = await AdminService.listAllQuotes({
        search: search as string | undefined,
        status: status ? (status as QuoteStatus) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.status(200).json({
        data: result.quotes,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType, search, page, limit } = req.query;

      const result = await AdminService.listAuditLogs({
        entityType: entityType ? (entityType as any) : undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.status(200).json({
        data: result.logs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}
