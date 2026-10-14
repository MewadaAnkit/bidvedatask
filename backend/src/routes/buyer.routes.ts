import { Router } from 'express';
import { Role } from '@prisma/client';
import { BuyerController } from '../controllers/buyer.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole([Role.BUYER, Role.ADMIN]));

// High level procurement KPIs
router.get('/stats', BuyerController.getStats);

// List of RFQs ready for evaluation
router.get('/evaluations', BuyerController.getEvaluations);

export default router;
