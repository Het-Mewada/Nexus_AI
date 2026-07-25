import { incomeRepository, IncomeFilters } from "../repositories/income.repository";
import { AppError } from "../middleware/errorHandler";
import { parseSort } from "../utils/response";

export class IncomeService {
  async list(
    userId: string,
    query: {
      page: number;
      limit: number;
      skip: number;
      sortBy?: string;
      sortOrder?: string;
      source?: string;
      startDate?: string;
      endDate?: string;
      minAmount?: string;
      maxAmount?: string;
      search?: string;
    }
  ) {
    const filters: IncomeFilters = {
      userId,
      source: query.source,
      search: query.search,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      minAmount: query.minAmount ? parseFloat(query.minAmount) : undefined,
      maxAmount: query.maxAmount ? parseFloat(query.maxAmount) : undefined,
    };

    const { field, order } = parseSort(query.sortBy, query.sortOrder, [
      "date",
      "amount",
      "source",
      "createdAt",
    ]);

    return incomeRepository.findMany(filters, query.skip, query.limit, {
      [field]: order,
    });
  }

  async getById(id: string, userId: string) {
    const income = await incomeRepository.findById(id, userId);
    if (!income) throw new AppError(404, "INCOME_NOT_FOUND", "Income record not found");
    return income;
  }

  async create(userId: string, data: {
    amount: number;
    source: string;
    date: Date;
    notes?: string;
    isRecurring?: boolean;
    currency?: string;
  }) {
    return incomeRepository.create({
      userId,
      amount: data.amount,
      source: data.source,
      date: data.date,
      notes: data.notes || null,
      isRecurring: data.isRecurring || false,
      currency: data.currency || "INR",
    });
  }

  async update(id: string, userId: string, data: {
    amount?: number;
    source?: string;
    date?: Date;
    notes?: string;
    isRecurring?: boolean;
    currency?: string;
  }) {
    const existing = await incomeRepository.findById(id, userId);
    if (!existing) throw new AppError(404, "INCOME_NOT_FOUND", "Income record not found");

    await incomeRepository.update(id, userId, data);
    return incomeRepository.findById(id, userId);
  }

  async delete(id: string, userId: string) {
    const existing = await incomeRepository.findById(id, userId);
    if (!existing) throw new AppError(404, "INCOME_NOT_FOUND", "Income record not found");

    await incomeRepository.softDelete(id, userId);
    return { message: "Income deleted successfully" };
  }
}

export const incomeService = new IncomeService();
