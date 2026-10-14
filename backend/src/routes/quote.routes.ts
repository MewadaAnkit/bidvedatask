import { Router } from 'express';
import { Role } from '@prisma/client';
import { QuoteController } from '../controllers/quote.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

// mergeParams: true allows accessing :id parameter from parent router (/api/rfqs/:id)
const router = Router({ mergeParams: true });

router.use(authenticate);

// 1. Vendor submits initial quote
router.post('/quotes', requireRole([Role.VENDOR]), QuoteController.submit);

// 2. Vendor revises existing quote before deadline
router.put('/quotes', requireRole([Role.VENDOR]), QuoteController.revise);

// 3. Vendor views their own quote and revision history
router.get('/my-quote', requireRole([Role.VENDOR]), QuoteController.getMyQuote);

// 4. Buyer/Admin views all quotes submitted on this RFQ (latest revisions only)
router.get('/quotes', requireRole([Role.BUYER, Role.ADMIN]), QuoteController.getRfqQuotes);

export default router;
