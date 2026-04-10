import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { authenticateToken, requirePermission } from '../middlewares/authMiddleware';

const router = Router();

// Only those with permission can access users management
router.get('/', authenticateToken, requirePermission('users.view'), getUsers);
router.post('/', authenticateToken, requirePermission('users.manage'), createUser as any);
router.put('/:id', authenticateToken, requirePermission('users.manage'), updateUser as any);
router.delete('/:id', authenticateToken, requirePermission('users.manage'), deleteUser as any);

export default router;
