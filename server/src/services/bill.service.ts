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

    if (data.isPaid === true && existing.isPaid === false) {
      // Update other fields first, but leave isPaid for markPaid to handle
      const { isPaid, ...restData } = data;
      if (Object.keys(restData).length > 0) {
        await prisma.bill.update({
          where: { id },
          data: restData,
        });
      }
      return this.markPaid(id, userId);
    }

    if (data.isPaid === false && existing.isPaid === true) {
      // Find the auto-generated expense linked to this bill and delete it
      const linkedExpense = await prisma.expense.findFirst({
        where: {
          userId,
          merchant: existing.name,
          notes: `Automatically logged from bill: ${existing.name}`
        },
        orderBy: { createdAt: 'desc' }
      });
      if (linkedExpense) {
        await prisma.expense.delete({ where: { id: linkedExpense.id } });
      }
    }

    return prisma.bill.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async markPaid(id: string, userId: string) {
    const existing = await prisma.bill.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw new AppError(404, 'BILL_NOT_FOUND', 'Bill not found');

    let categoryId = existing.categoryId;
    if (!categoryId) {
      let defaultBillsCategory = await prisma.category.findFirst({
        where: { userId, name: { equals: 'Bills', mode: 'insensitive' } }
      });
      if (!defaultBillsCategory) {
        defaultBillsCategory = await prisma.category.create({
          data: {
            userId,
            name: 'Bills',
            color: '#ef4444',
            icon: 'file-text'
          }
        });
      }
      categoryId = defaultBillsCategory.id;
    }

    // Create the expense for this bill payment
    await prisma.expense.create({
      data: {
        userId,
        amount: existing.amount,
        categoryId: categoryId,
        merchant: existing.name,
        date: new Date(),
        paymentMethod: 'cash',
        notes: `Automatically logged from bill: ${existing.name}`,
        isAutoSynced: true,
        syncSource: 'bill',
      }
    });

    if (existing.isRecurring) {
      const originalDay = new Date(existing.dueDate).getDate();
      const nextDueDate = new Date(existing.dueDate);
      nextDueDate.setDate(1); // Reset to 1st to prevent month skip
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      const daysInNewMonth = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, 0).getDate();
      nextDueDate.setDate(Math.min(originalDay, daysInNewMonth));

      return prisma.bill.update({
        where: { id },
        data: {
          isPaid: false,
          dueDate: nextDueDate,
        },
        include: { category: true },
      });
    }

    return prisma.bill.update({
      where: { id },
      data: { isPaid: true },
      include: { category: true },
    });
  }

  async undoPayment(id: string, userId: string) {
    const existing = await prisma.bill.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw new AppError(404, 'BILL_NOT_FOUND', 'Bill not found');

    if (!existing.isRecurring) {
      throw new AppError(400, 'NOT_RECURRING', 'Undo is only supported for recurring bills');
    }

    // 1. Delete the auto-generated expense log
    const linkedExpense = await prisma.expense.findFirst({
      where: {
        userId,
        merchant: existing.name,
        isAutoSynced: true,
        syncSource: 'bill',
      },
      orderBy: { createdAt: 'desc' }
    });
    if (linkedExpense) {
      await prisma.expense.delete({ where: { id: linkedExpense.id } });
    }

    // 2. Rewind the due date by 1 month
    const originalDay = new Date(existing.dueDate).getDate();
    const prevDueDate = new Date(existing.dueDate);
    prevDueDate.setDate(1); // Set to 1st to prevent month skip issues
    prevDueDate.setMonth(prevDueDate.getMonth() - 1);
    const daysInPrevMonth = new Date(prevDueDate.getFullYear(), prevDueDate.getMonth() + 1, 0).getDate();
    prevDueDate.setDate(Math.min(originalDay, daysInPrevMonth));

    return prisma.bill.update({
      where: { id },
      data: {
        dueDate: prevDueDate,
        isPaid: false
      },
      include: { category: true }
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
