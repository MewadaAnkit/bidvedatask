import { Router } from 'express';
import { Role } from '@prisma/client';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole([Role.VENDOR]));

// List all bids submitted by the authenticated vendor
router.get('/bids', VendorController.getMyBids);

// High level KPIs for vendor performance
router.get('/stats', VendorController.getStats);

export default router;
