import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { taxService } from "../services/tax.service";
import { sendSuccess, sendCreated } from "../utils/response";

export class TaxController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profiles = await taxService.list(req.user!.id);
      sendSuccess(res, profiles, "Tax profiles retrieved");
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await taxService.getById(req.params.id as string, req.user!.id);
      sendSuccess(res, profile, "Tax profile retrieved");
    } catch (error) { next(error); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await taxService.create(req.user!.id, req.body);
      sendCreated(res, profile, "Tax profile created successfully");
    } catch (error) { next(error); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await taxService.update(req.params.id as string, req.user!.id, req.body);
      sendSuccess(res, profile, "Tax profile updated successfully");
    } catch (error) { next(error); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await taxService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Tax profile deleted successfully");
    } catch (error) { next(error); }
  }
}

export const taxController = new TaxController();
