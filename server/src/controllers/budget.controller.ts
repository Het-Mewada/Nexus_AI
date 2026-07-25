import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { budgetService } from "../services/budget.service";
import { sendSuccess, sendCreated } from "../utils/response";

export class BudgetController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const budgets = await budgetService.list(req.user!.id);
      sendSuccess(res, budgets, "Budgets retrieved");
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const budget = await budgetService.getById(req.params.id as string, req.user!.id);
      sendSuccess(res, budget, "Budget retrieved");
    } catch (error) { next(error); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const budget = await budgetService.create(req.user!.id, req.body);
      sendCreated(res, budget, "Budget created successfully");
    } catch (error) { next(error); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const budget = await budgetService.update(req.params.id as string, req.user!.id, req.body);
      sendSuccess(res, budget, "Budget updated successfully");
    } catch (error) { next(error); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await budgetService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Budget deleted successfully");
    } catch (error) { next(error); }
  }
}

export const budgetController = new BudgetController();
