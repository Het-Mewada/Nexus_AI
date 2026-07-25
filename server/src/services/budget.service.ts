import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class BudgetService {
  async list(userId: string) {
    return prisma.budget.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string, userId: string) {
    const budget = await prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true },
    });
    if (!budget) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Budget not found');
    return budget;
  }

  async create(userId: string, data: {
    amount: number;
    type?: string;
    period?: string;
    categoryId?: string;
    startDate?: Date;
    endDate?: Date;
    alertThreshold?: number;
  }) {
    return prisma.budget.create({
      data: {
        userId,
        amount: data.amount,
        type: data.type || 'OVERALL',
        period: data.period || 'MONTHLY',
        categoryId: data.categoryId || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        alertThreshold: data.alertThreshold ?? 80,
      },
      include: { category: true },
    });
  }

  async update(id: string, userId: string, data: {
    amount?: number;
    type?: string;
    period?: string;
    categoryId?: string;
    startDate?: Date;
    endDate?: Date;
    alertThreshold?: number;
  }) {
    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Budget not found');

    return prisma.budget.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Budget not found');

    await prisma.budget.delete({ where: { id } });
    return { message: 'Budget deleted successfully' };
  }
}

export const budgetService = new BudgetService();
