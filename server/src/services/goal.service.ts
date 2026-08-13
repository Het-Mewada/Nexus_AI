import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class GoalService {
  async list(userId: string) {
    return prisma.goal.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string, userId: string) {
    const goal = await prisma.goal.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!goal) throw new AppError(404, 'GOAL_NOT_FOUND', 'Goal not found');
    return goal;
  }

  private async getSavingsCategory(userId: string) {
    let cat = await prisma.category.findFirst({
      where: { userId, name: { equals: 'Savings', mode: 'insensitive' } }
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: { userId, name: 'Savings', color: '#10b981', icon: 'piggy-bank' }
      });
    }
    return cat.id;
  }

  async create(userId: string, data: {
    name: string;
    targetAmount: number;
    deadline?: Date;
    monthlyContribution?: number;
    currentAmount?: number;
  }) {
    const goal = await prisma.goal.create({
      data: {
        userId,
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount || 0,
        deadline: data.deadline || null,
        monthlyContribution: data.monthlyContribution || null,
      },
    });

    if (data.currentAmount && data.currentAmount > 0) {
      const categoryId = await this.getSavingsCategory(userId);
      await prisma.expense.create({
        data: {
          userId,
          amount: data.currentAmount,
          categoryId,
          merchant: `Goal: ${goal.name}`,
          date: new Date(),
          paymentMethod: 'savings',
          notes: `Initial savings for goal "${goal.name}"`,
          isAutoSynced: true,
          syncSource: 'goal',
        }
      });
    }

    return goal;
  }

  async update(id: string, userId: string, data: {
    name?: string;
    targetAmount?: number;
    currentAmount?: number;
    deadline?: Date;
    monthlyContribution?: number;
  }) {
    const existing = await prisma.goal.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw new AppError(404, 'GOAL_NOT_FOUND', 'Goal not found');

    const updated = await prisma.goal.update({
      where: { id },
      data,
    });

    if (data.currentAmount !== undefined && data.currentAmount > Number(existing.currentAmount)) {
      const addedContribution = data.currentAmount - Number(existing.currentAmount);
      const categoryId = await this.getSavingsCategory(userId);
      await prisma.expense.create({
        data: {
          userId,
          amount: addedContribution,
          categoryId,
          merchant: `Goal: ${updated.name}`,
          date: new Date(),
          paymentMethod: 'savings',
          notes: `Contribution to goal "${updated.name}"`,
          isAutoSynced: true,
          syncSource: 'goal',
        }
      });
    }

    return updated;
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.goal.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw new AppError(404, 'GOAL_NOT_FOUND', 'Goal not found');

    await prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Goal deleted successfully' };
  }
}

export const goalService = new GoalService();
