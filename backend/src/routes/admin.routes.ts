import { Router } from 'express';
import { Role } from '@prisma/client';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Strict RBAC: All Admin routes require JWT authentication and ADMIN role
router.use(authenticate);
router.use(requireRole([Role.ADMIN]));

// User Management Routes
router.get('/users', AdminController.listUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// Platform "View Everything" Oversight Routes
router.get('/stats', AdminController.getStats);
router.get('/quotes', AdminController.listQuotes);
router.get('/audit-logs', AdminController.listAuditLogs);

export default router;
