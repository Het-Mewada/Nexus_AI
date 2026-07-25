import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class BillService {
  async list(userId: string) {
    return prisma.bill.findMany({
      where: { userId, deletedAt: null },
      include: { category: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getById(id: string, userId: string) {
    const bill = await prisma.bill.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true },
    });
    if (!bill) throw new AppError(404, 'BILL_NOT_FOUND', 'Bill not found');
    return bill;
  }

  async create(userId: string, data: {
    name: string;
    amount: number;
    dueDate: Date;
    categoryId?: string;
    isPaid?: boolean;
    autoPay?: boolean;
    isRecurring?: boolean;
    reminderDays?: number;
  }) {
    return prisma.bill.create({
      data: {
        userId,
        name: data.name,
        amount: data.amount,
        dueDate: data.dueDate,
        categoryId: data.categoryId || null,
        isPaid: data.isPaid || false,
        autoPay: data.autoPay || false,
        isRecurring: data.isRecurring || false,
        reminderDays: data.reminderDays ?? 3,
      },
      include: { category: true },
    });
  }

  async update(id: string, userId: string, data: {
    name?: string;
    amount?: number;
    dueDate?: Date;
    categoryId?: string;
    isPaid?: boolean;
    autoPay?: boolean;
    isRecurring?: boolean;
    reminderDays?: number;
  }) {
    const existing = await prisma.bill.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw new AppError(404, 'BILL_NOT_FOUND', 'Bill not found');

    return prisma.bill.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async markPaid(id: string, userId: string) {
    const existing = await prisma.bill.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw new AppError(404, 'BILL_NOT_FOUND', 'Bill not found');

    return prisma.bill.update({
      where: { id },
      data: { isPaid: true },
      include: { category: true },
    });
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.bill.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw new AppError(404, 'BILL_NOT_FOUND', 'Bill not found');

    await prisma.bill.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Bill deleted successfully' };
  }

  async getUpcoming(userId: string) {
    const now = new Date();
    return prisma.bill.findMany({
      where: {
        userId,
        deletedAt: null,
        isPaid: false,
        dueDate: { gte: now },
      },
      include: { category: true },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });
  }
}

export const billService = new BillService();
