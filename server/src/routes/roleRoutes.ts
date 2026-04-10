import { Router } from 'express';
import { getRoles, createRole, updateRole, deleteRole, getAvailablePermissions } from '../controllers/roleController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Basic routes protected by admin (for now, will upgrade to specific permission later)
router.get('/', authenticateToken, getRoles);
router.get('/permissions', authenticateToken, getAvailablePermissions);
router.post('/', authenticateToken, requireAdmin as any, createRole);
router.put('/:id', authenticateToken, requireAdmin as any, updateRole);
router.delete('/:id', authenticateToken, requireAdmin as any, deleteRole);

export default router;
