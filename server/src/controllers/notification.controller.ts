import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { notificationService } from "../services/notification.service";
import { sendSuccess } from "../utils/response";

export class NotificationController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notifications = await notificationService.list(req.user!.id);
      const unreadCount = await notificationService.getUnreadCount(req.user!.id);
      sendSuccess(res, { notifications, unreadCount }, "Notifications retrieved");
    } catch (error) { next(error); }
  }

  async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notification = await notificationService.markRead(req.params.id as string, req.user!.id);
      sendSuccess(res, notification, "Notification marked as read");
    } catch (error) { next(error); }
  }

  async markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAllRead(req.user!.id);
      sendSuccess(res, result, "All notifications marked as read");
    } catch (error) { next(error); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Notification deleted");
    } catch (error) { next(error); }
  }
}

export const notificationController = new NotificationController();
