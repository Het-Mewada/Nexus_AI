import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { subscriptionService } from "../services/subscription.service";
import { sendSuccess, sendCreated } from "../utils/response";

export class SubscriptionController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const subs = await subscriptionService.list(req.user!.id);
      sendSuccess(res, subs, "Subscriptions retrieved");
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sub = await subscriptionService.getById(req.params.id as string, req.user!.id);
      sendSuccess(res, sub, "Subscription retrieved");
    } catch (error) { next(error); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sub = await subscriptionService.create(req.user!.id, req.body);
      sendCreated(res, sub, "Subscription created successfully");
    } catch (error) { next(error); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sub = await subscriptionService.update(req.params.id as string, req.user!.id, req.body);
      sendSuccess(res, sub, "Subscription updated successfully");
    } catch (error) { next(error); }
  }

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sub = await subscriptionService.cancel(req.params.id as string, req.user!.id);
      sendSuccess(res, sub, "Subscription cancelled");
    } catch (error) { next(error); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await subscriptionService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Subscription deleted successfully");
    } catch (error) { next(error); }
  }
}

export const subscriptionController = new SubscriptionController();
