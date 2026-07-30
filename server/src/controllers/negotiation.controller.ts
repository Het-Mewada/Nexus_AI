import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { negotiationService } from "../services/negotiation.service";
import { logger } from "../utils/logger";

export class NegotiationController {
  async startNegotiation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { topic } = req.body;
      if (!topic) {
        res.status(400).json({ error: "Topic is required" });
        return;
      }

      const conversation = await negotiationService.startNegotiation(req.user!.id, topic);
      res.json(conversation);
    } catch (error: any) {
      logger.error("Error starting negotiation", { error: error.message });
      throw error;
    }
  }
}

export const negotiationController = new NegotiationController();
