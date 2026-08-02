import { expenseRepository, ExpenseFilters } from "../repositories/expense.repository";
import { AppError } from "../middleware/errorHandler";
import { parseSort } from "../utils/response";
import { storageService } from "./storage.service";

export class ExpenseService {
  async list(
    userId: string,
    query: {
      page: number;
      limit: number;
      skip: number;
      sortBy?: string;
      sortOrder?: string;
      categoryId?: string;
      merchant?: string;
      startDate?: string;
      endDate?: string;
      minAmount?: string;
      maxAmount?: string;
      paymentMethod?: string;
      tags?: string;
      search?: string;
    }
  ) {
    const filters: ExpenseFilters = {
      userId,
      categoryId: query.categoryId,
      merchant: query.merchant,
      paymentMethod: query.paymentMethod,
      search: query.search,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      minAmount: query.minAmount ? parseFloat(query.minAmount) : undefined,
      maxAmount: query.maxAmount ? parseFloat(query.maxAmount) : undefined,
      tags: query.tags ? query.tags.split(",").map((t) => t.trim()) : undefined,
    };

    const { field, order } = parseSort(query.sortBy, query.sortOrder, [
      "date",
      "amount",
      "merchant",
      "createdAt",
    ]);

    return expenseRepository.findMany(filters, query.skip, query.limit, {
      [field]: order,
    });
  }

  async getById(id: string, userId: string) {
    const expense = await expenseRepository.findById(id, userId);
    if (!expense) throw new AppError(404, "EXPENSE_NOT_FOUND", "Expense not found");
    return expense;
  }

  async create(
    userId: string,
    data: {
      amount: number;
      categoryId: string;
      merchant: string;
      date: Date;
      paymentMethod?: string;
      notes?: string;
      tags?: string[];
    },
    file?: Express.Multer.File
  ) {
    let receiptUrl: string | null = null;
    let receiptPath: string | null = null;

    if (file) {
      const result = await storageService.uploadReceipt(file, userId);
      receiptUrl = result.publicUrl;
      receiptPath = result.path;
    }

    return expenseRepository.create({
      userId,
      amount: data.amount,
      categoryId: data.categoryId,
      merchant: data.merchant,
      date: data.date,
      paymentMethod: data.paymentMethod || "cash",
      notes: data.notes || null,
      tags: data.tags || [],
      receiptUrl,
      receiptPath,
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      amount?: number;
      categoryId?: string;
      merchant?: string;
      date?: Date;
      paymentMethod?: string;
      notes?: string;
      tags?: string[];
    },
    file?: Express.Multer.File
  ) {
    const existing = await expenseRepository.findById(id, userId);
    if (!existing) throw new AppError(404, "EXPENSE_NOT_FOUND", "Expense not found");

    let receiptUrl = existing.receiptUrl;
    let receiptPath = existing.receiptPath;

    if (file) {
      if (existing.receiptPath) {
        await storageService.deleteReceipt(existing.receiptPath);
      }
      const result = await storageService.uploadReceipt(file, userId);
      receiptUrl = result.publicUrl;
      receiptPath = result.path;
    }

    return expenseRepository.update(id, userId, {
      ...data,
      receiptUrl,
      receiptPath,
    });
  }

  async delete(id: string, userId: string) {
    const existing = await expenseRepository.findById(id, userId);
    if (!existing) throw new AppError(404, "EXPENSE_NOT_FOUND", "Expense not found");

    if (existing.isAutoSynced) {
      throw new AppError(400, "SYNCED_RECORD", "This is a synced record. Please delete it from the Bills or Subscriptions section.");
    }

    if (existing.receiptPath) {
      await storageService.deleteReceipt(existing.receiptPath);
    }

    await expenseRepository.softDelete(id, userId);
    return { message: "Expense deleted successfully" };
  }
}

export const expenseService = new ExpenseService();
