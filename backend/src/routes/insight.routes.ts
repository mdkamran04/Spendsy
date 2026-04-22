import { Router } from 'express';
import { generateInsights, getInsights, handleChat } from '../controllers/insight.controller';

const router = Router();

router.post('/generate', generateInsights);
router.get('/', getInsights);
router.post('/chat', handleChat);

export default router;
