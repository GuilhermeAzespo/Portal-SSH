import { Router } from 'express';
import { getHosts, createHost, updateHost, deleteHost } from '../controllers/hostController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Everyone logged in can view the hosts
router.get('/', authenticateToken, getHosts as any);

// Only admins can create or delete hosts
router.post('/', authenticateToken, requireAdmin as any, createHost as any);
router.put('/:id', authenticateToken, requireAdmin as any, updateHost as any);
router.delete('/:id', authenticateToken, requireAdmin as any, deleteHost as any);

export default router;
