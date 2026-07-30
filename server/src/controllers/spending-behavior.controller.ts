import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { spendingBehaviorService } from "../services/spending-behavior.service";
import { logger } from "../utils/logger";

export class SpendingBehaviorController {
  async analyze(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await spendingBehaviorService.analyzeUserBehavior(req.user!.id);
      res.json(result);
    } catch (error: any) {
      logger.error("Error running spending behavior analysis", { error: error.message });
      throw error;
    }
  }

  async getInsights(req: AuthRequest, res: Response): Promise<void> {
    try {
      const insights = await spendingBehaviorService.getBehaviorInsights(req.user!.id);
      res.json(insights);
    } catch (error: any) {
      logger.error("Error fetching spending behavior insights", { error: error.message });
      throw error;
    }
  }
}

export const spendingBehaviorController = new SpendingBehaviorController();
