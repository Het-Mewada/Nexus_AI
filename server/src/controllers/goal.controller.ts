import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { goalService } from "../services/goal.service";
import { sendSuccess, sendCreated } from "../utils/response";

export class GoalController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const goals = await goalService.list(req.user!.id);
      sendSuccess(res, goals, "Goals retrieved");
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const goal = await goalService.getById(req.params.id as string, req.user!.id);
      sendSuccess(res, goal, "Goal retrieved");
    } catch (error) { next(error); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const goal = await goalService.create(req.user!.id, req.body);
      sendCreated(res, goal, "Goal created successfully");
    } catch (error) { next(error); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const goal = await goalService.update(req.params.id as string, req.user!.id, req.body);
      sendSuccess(res, goal, "Goal updated successfully");
    } catch (error) { next(error); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await goalService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Goal deleted successfully");
    } catch (error) { next(error); }
  }
}

export const goalController = new GoalController();
