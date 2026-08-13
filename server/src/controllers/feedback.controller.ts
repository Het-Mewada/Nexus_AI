import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { feedbackService } from "../services/feedback.service";
import { sendSuccess } from "../utils/response";

export const feedbackController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, title, description } = req.body;

      const files = req.files ? (req.files as Express.Multer.File[]) : [];

      const result = await feedbackService.create({
        userId: req.user!.id,
        type,
        title,
        description,
      }, files);

      sendSuccess(res, result, "Feedback submitted successfully", 201);
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await feedbackService.listByUser(req.user!.id);
      sendSuccess(res, result, "Feedback retrieved successfully");
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await feedbackService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Feedback deleted successfully");
    } catch (error) {
      next(error);
    }
  },

  async addReply(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { message } = req.body;
      const feedbackId = req.params.id;

      if (!message) {
        res.status(400).json({ success: false, error: "Message is required" });
        return;
      }

      const result = await feedbackService.addReply(feedbackId as string, req.user!.id, message);
      sendSuccess(res, result, "Reply added successfully", 201);
    } catch (error: any) {
      if (error.message.includes("not found") || error.message.includes("Cannot reply")) {
        res.status(400).json({ success: false, error: { message: error.message } });
        return;
      }
      next(error);
    }
  },
};
