import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

export interface IncomeFilters {
  userId: string;
  source?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export class IncomeRepository {
  private buildWhere(filters: IncomeFilters): Prisma.IncomeWhereInput {
    const where: Prisma.IncomeWhereInput = {
      userId: filters.userId,
      deletedAt: null,
    };

    if (filters.source) {
      where.source = { contains: filters.source, mode: "insensitive" };
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

    if (filters.search) {
      where.OR = [
        { source: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  async findMany(
    filters: IncomeFilters,
    skip: number,
    take: number,
    orderBy: Record<string, "asc" | "desc">
  ) {
    const where = this.buildWhere(filters);
    const [data, total] = await Promise.all([
      prisma.income.findMany({ where, skip, take, orderBy }),
      prisma.income.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string, userId: string) {
    return prisma.income.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  async create(data: Prisma.IncomeUncheckedCreateInput) {
    return prisma.income.create({ data });
  }

  async update(id: string, userId: string, data: Prisma.IncomeUncheckedUpdateInput) {
    return prisma.income.updateMany({
      where: { id, userId, deletedAt: null },
      data,
    });
  }

  async softDelete(id: string, userId: string) {
    return prisma.income.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async sumByDateRange(userId: string, startDate: Date, endDate: Date) {
    const result = await prisma.income.aggregate({
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    return result._sum.amount;
  }

  async getMonthlyTotals(userId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const incomes = await prisma.income.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      select: { amount: true, date: true },
    });

    const monthlyTotals: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) monthlyTotals[i] = 0;

    for (const income of incomes) {
      const month = income.date.getMonth() + 1;
      monthlyTotals[month] += Number(income.amount);
    }

    return monthlyTotals;
  }
}

export const incomeRepository = new IncomeRepository();
