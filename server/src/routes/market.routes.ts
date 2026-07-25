import { Router } from 'express';
import { marketController } from '../controllers/market.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public/Market routes
router.get('/search', authMiddleware, marketController.searchStock);
router.get('/quote/:symbol', authMiddleware, marketController.getQuote);
router.get('/chart/:symbol', authMiddleware, marketController.getChart);
router.get('/ipos', authMiddleware, marketController.getIpos);

// Watchlist routes
router.get('/watchlist', authMiddleware, marketController.getWatchlist);
router.post('/watchlist', authMiddleware, marketController.addToWatchlist);
router.delete('/watchlist/:symbol', authMiddleware, marketController.removeFromWatchlist);

export default router;
