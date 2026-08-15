import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

export interface ExpenseFilters {
  userId: string;
  categoryId?: string;
  merchant?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
  tags?: string[];
  search?: string;
}

export class ExpenseRepository {
  private async buildWhere(filters: ExpenseFilters): Promise<Prisma.ExpenseWhereInput> {
    const where: Prisma.ExpenseWhereInput = {
      userId: filters.userId,
      deletedAt: null,
    };

    if (filters.categoryId) where.categoryId = filters.categoryId;

    if (filters.merchant) {
      where.merchant = { contains: filters.merchant, mode: "insensitive" };
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = filters.minAmount;
      if (filters.maxAmount) where.amount.lte = filters.maxAmount;
    }

    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;

    let tagMatchIds: string[] | undefined;
    let searchTagMatchIds: string[] | undefined;

    if (filters.tags && filters.tags.length > 0) {
      const tagsParam = filters.tags.map((t) => t.toLowerCase());
      const result = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM expenses 
        WHERE user_id = ${filters.userId} 
        AND deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM unnest(tags) t 
          WHERE LOWER(t) = ANY(ARRAY[${Prisma.join(tagsParam)}]::text[])
        )
      `;
      tagMatchIds = result.map((r) => r.id);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const result = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM expenses 
        WHERE user_id = ${filters.userId} 
        AND deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM unnest(tags) t 
          WHERE LOWER(t) LIKE ${`%${searchLower}%`}
        )
      `;
      searchTagMatchIds = result.map((r) => r.id);
    }

    if (tagMatchIds) {
      where.id = { in: tagMatchIds };
    }

    if (filters.search) {
      where.OR = [
        { merchant: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
      if (searchTagMatchIds && searchTagMatchIds.length > 0) {
        where.OR.push({ id: { in: searchTagMatchIds } });
      }
    }

    return where;
  }

  async findMany(
    filters: ExpenseFilters,
    skip: number,
    take: number,
    orderBy: Record<string, "asc" | "desc">
  ) {
    const where = await this.buildWhere(filters);
    const [data, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { category: true },
      }),
      prisma.expense.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string, userId: string) {
    return prisma.expense.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true },
    });
  }

  async create(data: Prisma.ExpenseUncheckedCreateInput) {
    return prisma.expense.create({
      data,
      include: { category: true },
    });
  }

  async update(id: string, userId: string, data: Prisma.ExpenseUncheckedUpdateInput) {
    const result = await prisma.expense.updateMany({
      where: { id, userId, deletedAt: null },
      data,
    });
    if (result.count > 0) {
      return prisma.expense.findFirst({
        where: { id },
        include: { category: true },
      });
    }
    return null;
  }

  async softDelete(id: string, userId: string) {
    return prisma.expense.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async sumByDateRange(userId: string, startDate: Date, endDate: Date) {
    const result = await prisma.expense.aggregate({
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    return result._sum.amount;
  }

  async sumTotal(userId: string) {
    const result = await prisma.expense.aggregate({
      where: {
        userId,
        deletedAt: null,
      },
      _sum: { amount: true },
    });
    return result._sum.amount;
  }

  async getCategoryBreakdown(userId: string, startDate: Date, endDate: Date) {
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      select: { amount: true, category: { select: { id: true, name: true, color: true, icon: true } } },
    });

    const breakdown: Record<string, { name: string; color: string; icon: string; total: number; count: number }> = {};

    for (const expense of expenses) {
      const catId = expense.category.id;
      if (!breakdown[catId]) {
        breakdown[catId] = {
          name: expense.category.name,
          color: expense.category.color,
          icon: expense.category.icon,
          total: 0,
          count: 0,
        };
      }
      breakdown[catId].total += Number(expense.amount);
      breakdown[catId].count += 1;
    }

    return Object.entries(breakdown)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);
  }

  async getMonthlyTotals(userId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      select: { amount: true, date: true },
    });

    const monthlyTotals: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) monthlyTotals[i] = 0;

    for (const expense of expenses) {
      const month = expense.date.getMonth() + 1;
      monthlyTotals[month] += Number(expense.amount);
    }

    return monthlyTotals;
  }

  async getRecentTransactions(userId: string, limit: number = 10) {
    return prisma.expense.findMany({
      where: { userId, deletedAt: null },
      include: { category: true },
      orderBy: { date: "desc" },
      take: limit,
    });
  }
}

export const expenseRepository = new ExpenseRepository();
