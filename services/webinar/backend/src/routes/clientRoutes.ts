import { Router } from 'express';
import { 
  getClientStats, 
  getClientWebinars, 
  getClientSubscription, 
  updateClientProfile 
} from '../controllers/clientController.js';

import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/stats', getClientStats);
router.get('/webinars', getClientWebinars);
router.get('/subscription', getClientSubscription);
router.put('/profile', updateClientProfile);

export default router;
