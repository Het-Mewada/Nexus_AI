import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { aiCfoService } from "../services/ai-cfo.service";
import { logger } from "../utils/logger";

export class AiCfoController {
  async getRecommendations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const recommendations = await aiCfoService.getRecommendations(req.user!.id);
      res.json(recommendations);
    } catch (error: any) {
      logger.error("Error fetching AI CFO recommendations", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateRecommendationStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      
      if (!["ACCEPTED", "DISMISSED", "POSTPONED"].includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }

      const updated = await aiCfoService.updateRecommendationStatus(id, req.user!.id, status as any);
      res.json(updated);
    } catch (error: any) {
      logger.error("Error updating AI CFO recommendation status", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async generateManual(req: AuthRequest, res: Response): Promise<void> {
    try {
      const newRecs = await aiCfoService.generateProactiveRecommendations(req.user!.id);
      res.json(newRecs);
    } catch (error: any) {
      logger.error("Error generating AI CFO recommendations manually", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const aiCfoController = new AiCfoController();
