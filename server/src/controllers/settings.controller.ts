import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { settingsService } from "../services/settings.service";
import { sendSuccess } from "../utils/response";

export class SettingsController {
  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.get(req.user!.id);
      sendSuccess(res, settings, "Settings retrieved");
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.update(req.user!.id, req.body);
      sendSuccess(res, settings, "Settings updated successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
