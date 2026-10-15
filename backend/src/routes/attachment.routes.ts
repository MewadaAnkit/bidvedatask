import { Router } from 'express';
import { Role } from '@prisma/client';
import { AttachmentController } from '../controllers/attachment.controller';
import { authenticate, optionalAuthenticate, requireRole } from '../middleware/auth.middleware';
import { singleFileUpload } from '../middleware/upload.middleware';

const router = Router();

// 1. Download file stream (checks permissions in service: allows public RFQ specs, restricts draft RFQs and private quotes)
router.get('/:id/download', optionalAuthenticate, AttachmentController.download);

// 2. Vendor uploads document to Quote
router.post(
  '/quotes/:id/upload',
  authenticate,
  requireRole([Role.VENDOR]),
  singleFileUpload('file'),
  AttachmentController.uploadQuoteAttachment
);

// 3. View Quote attachments list
router.get('/quotes/:id', authenticate, AttachmentController.getQuoteAttachments);

export default router;
