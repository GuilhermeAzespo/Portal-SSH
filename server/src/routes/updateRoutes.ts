import { Router } from 'express';
import { triggerUpdate, checkUpdateStatus } from '../controllers/updateController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Only admins can trigger system updates
router.post('/trigger', authenticateToken, requireAdmin as any, triggerUpdate);

// Status endpoint is public - needed during server restart when token can't be verified
// It only returns log info (no sensitive data)
router.get('/status', checkUpdateStatus);

export default router;
