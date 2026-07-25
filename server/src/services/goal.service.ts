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

  async create(userId: string, data: {
    name: string;
    targetAmount: number;
    deadline?: Date;
    monthlyContribution?: number;
    currentAmount?: number;
  }) {
    return prisma.goal.create({
      data: {
        userId,
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount || 0,
        deadline: data.deadline || null,
        monthlyContribution: data.monthlyContribution || null,
      },
    });
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

    return prisma.goal.update({
      where: { id },
      data,
    });
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
