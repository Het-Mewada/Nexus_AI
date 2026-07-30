import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createInvestmentSchema, updateInvestmentSchema } from '../validators/schemas';
import {
  getPortfolioSummary,
  addInvestment,
  updateInvestment,
  deleteInvestment,
  sellInvestment,
  getMarketPrice,
  searchMarketSymbol,
  getTransactions,
} from '../controllers/investment.controller';

const router = Router();

router.use(authMiddleware);

router.get('/portfolio', getPortfolioSummary);
router.post('/portfolio', validate(createInvestmentSchema), addInvestment);
router.post('/portfolio/sell', sellInvestment);
router.patch('/portfolio/:id', validate(updateInvestmentSchema), updateInvestment);
router.delete('/portfolio/:id', deleteInvestment);
router.get('/market/price', getMarketPrice);
router.get('/market/search', searchMarketSymbol);
router.get('/portfolio/transactions', getTransactions);

export default router;
