import { Router } from 'express';
import { Role } from '@prisma/client';
import { AttachmentController } from '../controllers/attachment.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { singleFileUpload } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

// 1. Download file stream (strictly permission-checked for RFQ or Quote owner)
router.get('/:id/download', AttachmentController.download);

// 2. Vendor uploads document to Quote
router.post(
  '/quotes/:id/upload',
  requireRole([Role.VENDOR]),
  singleFileUpload('file'),
  AttachmentController.uploadQuoteAttachment
);

// 3. View Quote attachments list
router.get('/quotes/:id', AttachmentController.getQuoteAttachments);

export default router;
