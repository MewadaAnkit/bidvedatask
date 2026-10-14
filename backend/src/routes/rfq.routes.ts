import { Router } from 'express';
import { Role } from '@prisma/client';
import { RfqController } from '../controllers/rfq.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

import { AwardController } from '../controllers/award.controller';
import { AttachmentController } from '../controllers/attachment.controller';
import { singleFileUpload } from '../middleware/upload.middleware';
import quoteRoutes from './quote.routes';

const router = Router();

// All RFQ operations require a valid JWT token
router.use(authenticate);

// List RFQs with search, filters, pagination
router.get('/', RfqController.list);

// Create RFQ (Buyers and Admins only)
router.post('/', requireRole([Role.BUYER, Role.ADMIN]), RfqController.create);

// Get single RFQ details
router.get('/:id', RfqController.getById);

// Edit RFQ (Buyers and Admins only, while in DRAFT status)
router.put('/:id', requireRole([Role.BUYER, Role.ADMIN]), RfqController.update);

// Publish RFQ (Buyers and Admins only)
router.patch('/:id/publish', requireRole([Role.BUYER, Role.ADMIN]), RfqController.publish);

// RFQ Spec Attachments: Upload (Buyer only) & List
router.post(
  '/:id/attachments',
  requireRole([Role.BUYER, Role.ADMIN]),
  singleFileUpload('file'),
  AttachmentController.uploadRfqAttachment
);
router.get('/:id/attachments', AttachmentController.getRfqAttachments);

// Side-by-side comparison matrix (Buyers and Admins only)
router.get('/:id/comparison', requireRole([Role.BUYER, Role.ADMIN]), AwardController.getComparison);

// Shortlist/unshortlist a quote on an RFQ (Buyers and Admins only)
router.patch('/:id/quotes/:quoteId/shortlist', requireRole([Role.BUYER, Role.ADMIN]), AwardController.toggleShortlist);

// Atomically award RFQ to chosen quote (Buyers and Admins only)
router.post('/:id/award', requireRole([Role.BUYER, Role.ADMIN]), AwardController.award);

// Status change history audit trail for RFQ and quotes (Buyers and Admins only)
router.get('/:id/status-history', requireRole([Role.BUYER, Role.ADMIN]), AwardController.getStatusHistory);

// Mount nested quote sub-routes (/api/rfqs/:id/quotes, /api/rfqs/:id/my-quote)
router.use('/:id', quoteRoutes);

export default router;
