import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { categoryService } from "../services/category.service";
import { sendSuccess, sendCreated } from "../utils/response";

export class CategoryController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.list(req.user!.id);
      sendSuccess(res, categories, "Categories retrieved");
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.create(req.user!.id, req.body);
      sendCreated(res, category, "Category created successfully");
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.update(req.params.id as string, req.user!.id, req.body);
      sendSuccess(res, category, "Category updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await categoryService.delete(req.params.id as string, req.user!.id);
      sendSuccess(res, result, "Category deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
