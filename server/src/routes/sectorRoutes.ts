import { Router } from 'express';
import { getSectors, createSector, updateSector, deleteSector } from '../controllers/sectorController';
import { authenticateToken, requirePermission } from '../middlewares/authMiddleware';

const router = Router();

// Everyone authenticated can see sectors (needed for forms)
router.get('/', authenticateToken, getSectors);

// Only admins can manage sectors
router.post('/', authenticateToken, requirePermission('settings.view'), createSector as any);
router.put('/:id', authenticateToken, requirePermission('settings.view'), updateSector as any);
router.delete('/:id', authenticateToken, requirePermission('settings.view'), deleteSector as any);

export default router;
