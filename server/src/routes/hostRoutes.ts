import { Router } from 'express';
import { getHosts, createHost, updateHost, deleteHost } from '../controllers/hostController';
import { authenticateToken, requirePermission } from '../middlewares/authMiddleware';

const router = Router();

// Everyone with permission can see hosts
router.get('/', authenticateToken, requirePermission('hosts.view'), getHosts as any);

// Only managers can create or delete hosts
router.post('/', authenticateToken, requirePermission('hosts.manage'), createHost as any);
router.put('/:id', authenticateToken, requirePermission('hosts.manage'), updateHost as any);
router.delete('/:id', authenticateToken, requirePermission('hosts.manage'), deleteHost as any);

export default router;
