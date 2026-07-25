import { Request, Response, NextFunction } from 'express';
import { marketService } from '../services/market.service';

export const marketController = {
  searchStock: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ success: false, message: 'Query is required' });
        return;
      }
      const results = await marketService.searchStock(query);
      res.json({ success: true, data: results });
    } catch (error) { next(error); }
  },

  getQuote: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const symbol = req.params.symbol as string;
      const quote = await marketService.getQuote(symbol);
      if (!quote) { res.status(404).json({ success: false, message: 'Quote not found' }); return; }
      res.json({ success: true, data: quote });
    } catch (error) { next(error); }
  },

  getChart: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const symbol = req.params.symbol as string;
      const { interval = '1d', range = '1y' } = req.query;
      const chart = await marketService.getChart(symbol, interval as any, range as string);
      if (!chart) { res.status(404).json({ success: false, message: 'Chart not found' }); return; }
      res.json({ success: true, data: chart });
    } catch (error) { next(error); }
  },

  getIpos: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ipos = await marketService.getIpos();
      res.json({ success: true, data: ipos });
    } catch (error) { next(error); }
  },

  getWatchlist: async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const list = await marketService.getWatchlist(req.user.id);
      res.json({ success: true, data: list });
    } catch (error) { next(error); }
  },

  addToWatchlist: async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { symbol, name } = req.body;
      if (!symbol) { res.status(400).json({ success: false, message: 'Symbol is required' }); return; }
      const result = await marketService.addToWatchlist(req.user.id, symbol, name);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  removeFromWatchlist: async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { symbol } = req.params;
      await marketService.removeFromWatchlist(req.user.id, symbol);
      res.json({ success: true, message: 'Removed from watchlist' });
    } catch (error) { next(error); }
  },
};
