import { categoryRepository } from "../repositories/category.repository";
import { AppError } from "../middleware/errorHandler";

export class CategoryService {
  async list(userId: string) {
    return categoryRepository.findAll(userId);
  }

  async create(userId: string, data: { name: string; color?: string; icon?: string }) {
    const existing = await categoryRepository.findByName(userId, data.name);
    if (existing) {
      throw new AppError(409, "CATEGORY_EXISTS", `Category "${data.name}" already exists`);
    }

    return categoryRepository.create({
      userId,
      name: data.name,
      color: data.color || "#6366f1",
      icon: data.icon || "tag",
      isDefault: false,
    });
  }

  async update(id: string, userId: string, data: { name?: string; color?: string; icon?: string }) {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found");

    if (existing.isDefault) {
      throw new AppError(403, "CANNOT_EDIT_DEFAULT", "Default categories cannot be edited");
    }

    if (existing.userId !== userId) {
      throw new AppError(403, "FORBIDDEN", "You can only edit your own categories");
    }

    if (data.name && data.name !== existing.name) {
      const nameExists = await categoryRepository.findByName(userId, data.name);
      if (nameExists) {
        throw new AppError(409, "CATEGORY_EXISTS", `Category "${data.name}" already exists`);
      }
    }

    await categoryRepository.update(id, userId, data);
    return categoryRepository.findById(id);
  }

  async delete(id: string, userId: string) {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found");

    if (existing.isDefault) {
      throw new AppError(403, "CANNOT_DELETE_DEFAULT", "Default categories cannot be deleted");
    }

    if (existing.userId !== userId) {
      throw new AppError(403, "FORBIDDEN", "You can only delete your own categories");
    }

    const hasExpenses = await categoryRepository.hasExpenses(id);
    if (hasExpenses) {
      throw new AppError(409, "CATEGORY_IN_USE", "Cannot delete a category that has expenses. Reassign expenses first.");
    }

    await categoryRepository.softDelete(id, userId);
    return { message: "Category deleted successfully" };
  }
}

export const categoryService = new CategoryService();
