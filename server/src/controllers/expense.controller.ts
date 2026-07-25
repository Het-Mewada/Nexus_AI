import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { expenseService } from "../services/expense.service";
import { sendSuccess, sendCreated, sendPaginated, parsePaginationQuery } from "../utils/response";

export class ExpenseController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip } = parsePaginationQuery(req.query as Record<string, string>);
      const { data, total } = await expenseService.list(req.user!.id, {
        ...(req.query as Record<string, string>),
        page,
        limit,
        skip,
      });
      sendPaginated(res, data, total, page, limit, "Expenses retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.getById(req.params.id as string, req.user!.id);
      sendSuccess(res, expense, "Expense retrieved");
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      if (typeof body.tags === "string") {
        body.tags = body.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
      }
      const expense = await expenseService.create(req.user!.id, body, req.file);
      sendCreated(res, expense, "Expense created successfully");
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      if (typeof body.tags === "string") {
        body.tags = body.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
      }
      const expense = await expenseService.update(req.params.id as string, req.user!.id, body, req.file);
      sendSuccess(res, expense, "Expense updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await expenseService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Expense deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const expenseController = new ExpenseController();
