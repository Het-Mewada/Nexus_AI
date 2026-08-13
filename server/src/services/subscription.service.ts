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

  async processUpcomingPayments() {
    const now = new Date();
    const dueSubscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', nextPayment: { lte: now } },
    });

    for (const sub of dueSubscriptions) {
      const originalDay = new Date(sub.nextPayment).getDate();
      const nextDate = new Date(sub.nextPayment);
      nextDate.setDate(1);

      if (sub.billingCycle === 'YEARLY') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        nextDate.setDate(originalDay);
      } else { // MONTHLY
        nextDate.setMonth(nextDate.getMonth() + 1);
        const daysInNewMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(originalDay, daysInNewMonth));
      }

      let categoryId = sub.categoryId;
      if (!categoryId) {
        let subCat = await prisma.category.findFirst({
          where: { userId: sub.userId, name: { equals: 'Subscriptions', mode: 'insensitive' } }
        });
        if (!subCat) {
          subCat = await prisma.category.create({
            data: { userId: sub.userId, name: 'Subscriptions', color: '#8b5cf6', icon: 'repeat' }
          });
        }
        categoryId = subCat.id;
      }

      await prisma.expense.create({
        data: {
          userId: sub.userId,
          amount: sub.amount,
          categoryId,
          merchant: sub.name,
          date: new Date(),
          paymentMethod: 'subscription',
          notes: `Subscription payment: ${sub.name}`,
          isAutoSynced: true,
          syncSource: 'subscription',
        }
      });

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { nextPayment: nextDate },
      });
    }
  }
}

export const subscriptionService = new SubscriptionService();
