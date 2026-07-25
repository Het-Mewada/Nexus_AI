import { Router } from 'express';
import { smartSavingsController } from '../controllers/smart-savings.controller';

const router = Router();

// Routes for /api/smart-savings
router.post('/', smartSavingsController.addSmartSaving);
router.get('/', smartSavingsController.getSmartSavings);
router.get('/analytics/dashboard', smartSavingsController.getAnalytics);
router.get('/analytics/insights', smartSavingsController.getAiInsights);
router.get('/achievements', smartSavingsController.getAchievements);

export default router;
