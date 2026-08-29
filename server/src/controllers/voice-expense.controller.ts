import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../config/database";
import { voiceExpenseService } from "../services/voice-expense.service";
import { deepgramService } from "../services/deepgram.service";
import { sendSuccess } from "../utils/response";

export class VoiceExpenseController {
  async parseVoiceExpense(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { text, userTimezone, referenceDate } = req.body;
      const userId = req.user!.id;

      if (!text || typeof text !== "string") {
        res.status(400).json({
          success: false,
          error: { message: "Spoken or typed expense transcript text is required." },
        });
        return;
      }

      // Fetch user details for currency & timezone defaults
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true, timezone: true },
      });

      const currency = user?.currency || "INR";
      const timezone = userTimezone || user?.timezone || "Asia/Kolkata";

      // Fetch active user categories + default categories
      const categories = await prisma.category.findMany({
        where: {
          OR: [{ userId }, { isDefault: true }],
          deletedAt: null,
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      const result = await voiceExpenseService.parseVoiceExpense(
        text,
        categories,
        currency,
        timezone,
        referenceDate
      );

      sendSuccess(res, result, "Voice expense parsed successfully");
    } catch (error) {
      next(error);
    }
  }

  async transcribeAudio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file || !file.buffer) {
        res.status(400).json({
          success: false,
          error: { message: "No audio file provided. Please record or upload an audio file." },
        });
        return;
      }

      const lang = (req.query.lang as string) || "en-IN";
      const result = await deepgramService.transcribeAudio(file.buffer, file.mimetype, lang);

      sendSuccess(res, result, "Audio transcribed successfully via Deepgram");
    } catch (error) {
      next(error);
    }
  }
}

export const voiceExpenseController = new VoiceExpenseController();

