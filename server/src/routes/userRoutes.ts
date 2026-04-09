import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Only admins can access users management
router.get('/', authenticateToken, requireAdmin as any, getUsers);
router.post('/', authenticateToken, requireAdmin as any, createUser as any);
router.put('/:id', authenticateToken, requireAdmin as any, updateUser as any);
router.delete('/:id', authenticateToken, requireAdmin as any, deleteUser as any);

export default router;
