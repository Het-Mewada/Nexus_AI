import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { analyticsService } from "../services/analytics.service";
import { sendSuccess } from "../utils/response";

export class AnalyticsController {
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDashboardSummary(req.user!.id);
      sendSuccess(res, data, "Dashboard data retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getCharts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const data = await analyticsService.getChartData(req.user!.id, year);
      sendSuccess(res, data, "Chart data retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getCashFlow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const data = await analyticsService.getCashFlowData(req.user!.id, year);
      sendSuccess(res, data, "Cash flow data retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getCategoryBreakdown(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const data = await analyticsService.getCategoryBreakdown(req.user!.id, year, month);
      sendSuccess(res, data, "Category breakdown retrieved");
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
