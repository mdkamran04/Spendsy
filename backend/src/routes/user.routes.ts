import { Router } from 'express';
import { getUserProfile, updateSavingsGoal, updateUserProfile } from '../controllers/user.controller';

const router = Router();

router.get('/profile', getUserProfile);
router.patch('/profile', updateUserProfile);
router.patch('/savings-goal', updateSavingsGoal);

export default router;
