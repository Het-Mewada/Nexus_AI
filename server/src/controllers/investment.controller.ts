import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { portfolioService } from '../services/portfolio.service';
import { MarketService } from '../services/market.service';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

const marketService = new MarketService();

export const getPortfolioSummary = async (req: AuthRequest, res: Response) => {
  try {
    const summary = await portfolioService.getPortfolioSummary(req.user!.id);
    sendSuccess(res, summary);
  } catch (error) {
    logger.error('Failed to get portfolio summary', { error });
    throw error;
  }
};

export const addInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const investment = await portfolioService.addInvestment(req.user!.id, req.body);
    sendSuccess(res, investment, 'Investment added successfully', 201);
  } catch (error: any) {
    logger.error('Failed to add investment', { error });
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to add investment' } });
  }
};

export const updateInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const investment = await portfolioService.updateInvestment(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, investment, 'Investment updated successfully');
  } catch (error: any) {
    logger.error('Failed to update investment', { error });
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to update investment' } });
  }
};

export const deleteInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const result = await portfolioService.deleteInvestment(req.user!.id, req.params.id as string);
    sendSuccess(res, result, 'Investment deleted successfully');
  } catch (error: any) {
    logger.error('Failed to delete investment', { error });
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to delete investment' } });
  }
};

export const getMarketPrice = async (req: AuthRequest, res: Response) => {
  try {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== 'string') { res.status(400).json({ success: false, error: { message: 'Symbol is required' } }); return; }
    const price = await marketService.getLivePrice(symbol as string);
    sendSuccess(res, { symbol, price });
  } catch (error) {
    throw error; return;
  }
};

export const sellInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const result = await portfolioService.sellInvestment(req.user!.id, req.body);
    sendSuccess(res, result, 'Investment sold successfully');
  } catch (error: any) {
    logger.error('Failed to sell investment', { error });
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to sell investment' } });
  }
};

export const searchMarketSymbol = async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') { res.status(400).json({ success: false, error: { message: 'Query is required' } }); return; }
    const results = await marketService.searchSymbol(query as string);
    sendSuccess(res, results);
  } catch (error) {
    throw error; return;
  }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { symbol } = req.query;
    const transactions = await portfolioService.getTransactions(req.user!.id, symbol as string | undefined);
    sendSuccess(res, transactions);
  } catch (error) {
    throw error; return;
  }
};

export const investmentController = {
  getPortfolioSummary,
  addInvestment,
  updateInvestment,
  deleteInvestment,
  sellInvestment,
  getMarketPrice,
  searchMarketSymbol,
  getTransactions,
};
