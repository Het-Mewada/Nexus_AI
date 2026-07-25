import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { emailService } from "../services/email.service";
import { sendSuccess } from "../utils/response";

export class AuthController {
  async syncUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;

      if (req.body.isNewUser) {
        await emailService.sendWelcomeEmail(user.email, req.body.name || "");
      }

      sendSuccess(res, {
        id: user.id,
        email: user.email,
      }, "User synced successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
