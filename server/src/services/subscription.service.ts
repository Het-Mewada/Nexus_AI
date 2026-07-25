import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class SubscriptionService {
  async list(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { nextPayment: 'asc' },
    });
  }

  async getById(id: string, userId: string) {
    const sub = await prisma.subscription.findFirst({
      where: { id, userId },
      include: { category: true },
    });
    if (!sub) throw new AppError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    return sub;
  }

  async create(userId: string, data: {
    name: string;
    amount: number;
    billingCycle?: string;
    nextPayment: Date;
    categoryId?: string;
  }) {
    return prisma.subscription.create({
      data: {
        userId,
        name: data.name,
        amount: data.amount,
        billingCycle: data.billingCycle || 'MONTHLY',
        nextPayment: data.nextPayment,
        categoryId: data.categoryId || null,
        status: 'ACTIVE',
      },
      include: { category: true },
    });
  }

  async update(id: string, userId: string, data: {
    name?: string;
    amount?: number;
    billingCycle?: string;
    nextPayment?: Date;
    categoryId?: string;
  }) {
    const existing = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');

    return prisma.subscription.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async cancel(id: string, userId: string) {
    const existing = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');

    return prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { category: true },
    });
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');

    await prisma.subscription.delete({ where: { id } });
    return { message: 'Subscription deleted successfully' };
  }
}

export const subscriptionService = new SubscriptionService();
