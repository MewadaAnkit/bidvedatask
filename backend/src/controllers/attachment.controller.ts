import { Request, Response, NextFunction } from 'express';
import { AttachmentService } from '../services/attachment.service';
import { AppError } from '../middleware/error.middleware';

export class AttachmentController {
  static async uploadRfqAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      if (!req.file) {
        throw new AppError(400, 'FILE_MISSING', 'Please select a file to upload');
      }

      const { id: rfqId } = req.params;
      const attachment = await AttachmentService.uploadRfqAttachment(
        req.user.id,
        req.user.role,
        rfqId,
        req.file
      );

      res.status(201).json({
        data: {
          id: attachment.id,
          originalFilename: attachment.originalFilename,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          createdAt: attachment.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRfqAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id: rfqId } = req.params;
      const list = await AttachmentService.getRfqAttachments(req.user.id, req.user.role, rfqId);

      res.status(200).json({
        data: list,
      });
    } catch (error) {
      next(error);
    }
  }

  static async uploadQuoteAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      if (!req.file) {
        throw new AppError(400, 'FILE_MISSING', 'Please select a file to upload');
      }

      const { id: quoteId } = req.params;
      const attachment = await AttachmentService.uploadQuoteAttachment(
        req.user.id,
        req.user.role,
        quoteId,
        req.file
      );

      res.status(201).json({
        data: {
          id: attachment.id,
          originalFilename: attachment.originalFilename,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          createdAt: attachment.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQuoteAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id: quoteId } = req.params;
      const list = await AttachmentService.getQuoteAttachments(req.user.id, req.user.role, quoteId);

      res.status(200).json({
        data: list,
      });
    } catch (error) {
      next(error);
    }
  }

  static async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const { id } = req.params;
      const { stream, attachment } = await AttachmentService.getAttachmentStream(
        req.user.id,
        req.user.role,
        id
      );

      // Safe headers
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Length', attachment.fileSize);
      // Clean filename for header
      const safeFilename = encodeURIComponent(attachment.originalFilename);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`
      );

      stream.on('error', (err) => {
        next(err);
      });

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}
