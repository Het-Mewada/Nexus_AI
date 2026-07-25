import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { smartSavingsService } from '../services/smart-savings.service';

export const smartSavingsController = {
  addSmartSaving: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const saving = await smartSavingsService.addSmartSaving(req.user!.id, req.body);
      res.status(201).json({ success: true, data: saving });
    } catch (error: any) {
      next(error);
    }
  },

  getSmartSavings: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters = req.query;
      const savings = await smartSavingsService.getSmartSavings(req.user!.id, filters);
      res.json({ success: true, data: savings });
    } catch (error: any) {
      next(error);
    }
  },

  getAnalytics: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const analytics = await smartSavingsService.getAnalytics(req.user!.id);
      res.json({ success: true, data: analytics });
    } catch (error: any) {
      next(error);
    }
  },

  getAiInsights: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const insights = await smartSavingsService.generateAiInsights(req.user!.id);
      res.json({ success: true, data: insights });
    } catch (error: any) {
      next(error);
    }
  },

  getAchievements: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const achievements = await smartSavingsService.getAchievements(req.user!.id);
      res.json({ success: true, data: achievements });
    } catch (error: any) {
      next(error);
    }
  }
};
