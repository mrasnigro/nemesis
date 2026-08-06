import { Router } from 'express';
import { getStats, getUsers, createUser, updateUser, toggleUser, getPlans, createNewPlan, updateExistingPlan, deleteExistingPlan, getWebinars } from '../controllers/adminController.js';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:userId', updateUser);
router.post('/users/:userId/toggle', toggleUser);
router.get('/plans', getPlans);
router.post('/plans', createNewPlan);
router.put('/plans/:planId', updateExistingPlan);
router.delete('/plans/:planId', deleteExistingPlan);
router.get('/webinars', getWebinars);

export default router;
