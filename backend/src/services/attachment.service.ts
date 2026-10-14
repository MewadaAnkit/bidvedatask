import { EntityType, Role, RfqStatus } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../middleware/error.middleware';
import { defaultStorage } from './storage/local-storage.service';
import { validateUploadedFile } from '../utils/file-validator';

export class AttachmentService {
  /**
   * Uploads a specification attachment to an RFQ (Buyer only).
   */
  static async uploadRfqAttachment(
    userId: string,
    userRole: Role,
    rfqId: string,
    file: Express.Multer.File
  ) {
    const validated = validateUploadedFile(file);

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
      throw new AppError(400, 'INVALID_STATUS', 'Cannot attach files to an already AWARDED RFQ');
    }

    // Save using abstract StorageProvider with UUID stored filename
    const saved = await defaultStorage.save(file.buffer, validated.extension);

    const attachment = await prisma.attachment.create({
      data: {
        uploaderId: userId,
        entityType: EntityType.RFQ,
        entityId: rfqId,
        originalFilename: file.originalname,
        storedFilename: saved.storedFilename,
        filePath: saved.filePath,
        mimeType: validated.mimeType,
        fileSize: saved.fileSize,
      },
    });

    return attachment;
  }

  /**
   * Uploads a supporting document to a quote (Vendor only).
   */
  static async uploadQuoteAttachment(
    userId: string,
    userRole: Role,
    quoteId: string,
    file: Express.Multer.File
  ) {
    const validated = validateUploadedFile(file);

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { rfq: true },
    });

    if (!quote) {
      throw new AppError(404, 'NOT_FOUND', 'Quote not found');
    }

    if (userRole === Role.VENDOR && quote.vendorId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'Quote not found');
    }

    // Server clock deadline check
    if (new Date() > new Date(quote.rfq.deadline)) {
      throw new AppError(
        400,
        'DEADLINE_PASSED',
        'Cannot attach files after the RFQ submission deadline has passed'
      );
    }

    const saved = await defaultStorage.save(file.buffer, validated.extension);

    const attachment = await prisma.attachment.create({
      data: {
        uploaderId: userId,
        entityType: EntityType.QUOTE,
        entityId: quoteId,
        originalFilename: file.originalname,
        storedFilename: saved.storedFilename,
        filePath: saved.filePath,
        mimeType: validated.mimeType,
        fileSize: saved.fileSize,
      },
    });

    return attachment;
  }

  /**
   * Retrieves an authenticated streaming download of a file.
   * Strictly enforces sealed bid privacy and ownership.
   */
  static async getAttachmentStream(
    userId: string,
    userRole: Role,
    attachmentId: string
  ) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new AppError(404, 'NOT_FOUND', 'Attachment not found');
    }

    // Role and Ownership checks based on entity type
    if (attachment.entityType === EntityType.RFQ) {
      const rfq = await prisma.rFQ.findUnique({
        where: { id: attachment.entityId },
      });

      if (!rfq) {
        throw new AppError(404, 'NOT_FOUND', 'Parent RFQ not found');
      }

      if (userRole === Role.BUYER && rfq.buyerId !== userId) {
        throw new AppError(404, 'NOT_FOUND', 'Attachment not found');
      }

      // Vendors can only access specs of PUBLISHED/CLOSED/AWARDED RFQs, never DRAFT
      if (userRole === Role.VENDOR && rfq.status === RfqStatus.DRAFT) {
        throw new AppError(404, 'NOT_FOUND', 'Attachment not found');
      }
    } else if (attachment.entityType === EntityType.QUOTE) {
      const quote = await prisma.quote.findUnique({
        where: { id: attachment.entityId },
        include: { rfq: true },
      });

      if (!quote) {
        throw new AppError(404, 'NOT_FOUND', 'Parent quote not found');
      }

      // Sealed-bid security:
      // Vendor can ONLY download documents from their OWN quote.
      if (userRole === Role.VENDOR && quote.vendorId !== userId) {
        throw new AppError(404, 'NOT_FOUND', 'Attachment not found');
      }

      // Buyer can ONLY download documents from quotes belonging to their OWN RFQ.
      if (userRole === Role.BUYER && quote.rfq.buyerId !== userId) {
        throw new AppError(404, 'NOT_FOUND', 'Attachment not found');
      }
    }

    const stream = defaultStorage.getStream(attachment.filePath);

    return {
      stream,
      attachment,
    };
  }

  /**
   * Lists attachments associated with an RFQ.
   */
  static async getRfqAttachments(userId: string, userRole: Role, rfqId: string) {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    if (userRole === Role.BUYER && rfq.buyerId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    if (userRole === Role.VENDOR && rfq.status === RfqStatus.DRAFT) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    return await prisma.attachment.findMany({
      where: {
        entityType: EntityType.RFQ,
        entityId: rfqId,
      },
      select: {
        id: true,
        originalFilename: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lists attachments associated with a Quote.
   */
  static async getQuoteAttachments(userId: string, userRole: Role, quoteId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { rfq: true },
    });

    if (!quote) {
      throw new AppError(404, 'NOT_FOUND', 'Quote not found');
    }

    if (userRole === Role.VENDOR && quote.vendorId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'Quote not found');
    }

    if (userRole === Role.BUYER && quote.rfq.buyerId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'Quote not found');
    }

    return await prisma.attachment.findMany({
      where: {
        entityType: EntityType.QUOTE,
        entityId: quoteId,
      },
      select: {
        id: true,
        originalFilename: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
