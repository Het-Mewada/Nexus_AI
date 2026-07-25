import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { aiService } from "../services/ai.service";
import { sendSuccess } from "../utils/response";

export class AIController {
  async getInsights(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const insights = await aiService.generateInsights(req.user!.id);
      sendSuccess(res, { insights }, "AI insights generated successfully");
    } catch (error) {
      next(error);
    }
  }

  async chat(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { query } = req.body;
      if (!query) {
        res.status(400).json({ success: false, error: { message: "Query is required" } });
        return;
      }
      
      const response = await aiService.chatAdvisor(req.user!.id, query);
      sendSuccess(res, response, "AI response generated");
    } catch (error) {
      next(error);
    }
  }

  async categorize(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { merchant, description } = req.body;
      if (!merchant) {
        res.status(400).json({ success: false, error: { message: "Merchant is required" } });
        return;
      }
      
      const category = await aiService.categorizeTransaction(merchant, description);
      sendSuccess(res, { category }, "AI categorized successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AIController();
