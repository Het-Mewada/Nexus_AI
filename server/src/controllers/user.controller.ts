import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { userService } from "../services/user.service";
import { sendSuccess } from "../utils/response";

export class UserController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getProfile(req.user!.id);
      sendSuccess(res, user, "Profile retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, user, "Profile updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await userService.deleteAccount(req.user!.id, req.user!.supabaseId);
      sendSuccess(res, result, "Account deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
