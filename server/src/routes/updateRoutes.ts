import { Router } from 'express';
import { triggerUpdate, checkUpdateStatus } from '../controllers/updateController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Only admins can trigger system updates
router.post('/trigger', authenticateToken, requireAdmin as any, triggerUpdate);
router.get('/status', authenticateToken, requireAdmin as any, checkUpdateStatus);

export default router;
