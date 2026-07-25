import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { billService } from "../services/bill.service";
import { sendSuccess, sendCreated } from "../utils/response";

export class BillController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bills = await billService.list(req.user!.id);
      sendSuccess(res, bills, "Bills retrieved");
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bill = await billService.getById(req.params.id as string, req.user!.id);
      sendSuccess(res, bill, "Bill retrieved");
    } catch (error) { next(error); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bill = await billService.create(req.user!.id, req.body);
      sendCreated(res, bill, "Bill created successfully");
    } catch (error) { next(error); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bill = await billService.update(req.params.id as string, req.user!.id, req.body);
      sendSuccess(res, bill, "Bill updated successfully");
    } catch (error) { next(error); }
  }

  async markPaid(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bill = await billService.markPaid(req.params.id as string, req.user!.id);
      sendSuccess(res, bill, "Bill marked as paid");
    } catch (error) { next(error); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await billService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Bill deleted successfully");
    } catch (error) { next(error); }
  }
}

export const billController = new BillController();
