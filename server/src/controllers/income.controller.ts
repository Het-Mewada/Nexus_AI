import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { incomeService } from "../services/income.service";
import { sendSuccess, sendCreated, sendPaginated, parsePaginationQuery } from "../utils/response";

export class IncomeController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip } = parsePaginationQuery(req.query as Record<string, string>);
      const { data, total } = await incomeService.list(req.user!.id, {
        ...(req.query as Record<string, string>),
        page,
        limit,
        skip,
      });
      sendPaginated(res, data, total, page, limit, "Income records retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const income = await incomeService.getById(req.params.id as string, req.user!.id);
      sendSuccess(res, income, "Income record retrieved");
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const income = await incomeService.create(req.user!.id, req.body);
      sendCreated(res, income, "Income created successfully");
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const income = await incomeService.update(req.params.id as string, req.user!.id, req.body);
      sendSuccess(res, income, "Income updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await incomeService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Income deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const incomeController = new IncomeController();
