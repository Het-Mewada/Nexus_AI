import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { salaryService } from "../services/salary.service";
import { sendSuccess, sendCreated } from "../utils/response";

export class SalaryController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const records = await salaryService.list(req.user!.id);
      sendSuccess(res, records, "Salary records retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const record = await salaryService.getById(req.params.id as string, req.user!.id);
      sendSuccess(res, record, "Salary record retrieved");
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const record = await salaryService.createOrUpdate(req.user!.id, req.body);
      sendCreated(res, record, "Salary record saved successfully");
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const record = await salaryService.update(req.params.id as string, req.user!.id, req.body);
      sendSuccess(res, record, "Salary record updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await salaryService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Salary record deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const salaryController = new SalaryController();
