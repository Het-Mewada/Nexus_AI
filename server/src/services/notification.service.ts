import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class NotificationService {
  async list(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(userId: string, type: string, title: string, message: string, metadata?: any) {
    return prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata || undefined,
      },
    });
  }

  async markRead(id: string, userId: string) {
    const existing = await prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');

    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');

    await prisma.notification.delete({ where: { id } });
    return { message: 'Notification deleted' };
  }
}

export const notificationService = new NotificationService();
