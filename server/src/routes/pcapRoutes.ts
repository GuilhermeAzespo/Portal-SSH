import { Router } from 'express';
import { upload, analyzePcap } from '../controllers/pcapController';

const router = Router();

router.post('/analyze', upload, analyzePcap);

export default router;
