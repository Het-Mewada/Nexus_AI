import { prisma } from "../config/database";
import { AppError } from "../middleware/errorHandler";

export const adminService = {
  async getGlobalStats() {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: "ACTIVE" } });
    const suspendedUsers = await prisma.user.count({ where: { status: "SUSPENDED" } });
    const totalTransactions = await prisma.expense.count() + await prisma.income.count();
    const totalFeedbacks = await prisma.feedback.count();
    const openFeedbacks = await prisma.feedback.count({ where: { status: "OPEN" } });

    return {
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      transactions: { total: totalTransactions },
      feedback: { total: totalFeedbacks, open: openFeedbacks }
    };
  },

  async listUsers(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;
    
    const whereClause = search ? {
      OR: [
        { email: { contains: search, mode: "insensitive" as const } },
        { name: { contains: search, mode: "insensitive" as const } }
      ]
    } : {};

    const users = await prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: { expenses: true, incomes: true, feedbacks: true }
        }
      }
    });

    const total = await prisma.user.count({ where: whereClause });

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async updateUserStatus(targetUserId: string, status: "ACTIVE" | "SUSPENDED", adminUserId?: string) {
    if (adminUserId && targetUserId === adminUserId && status === "SUSPENDED") {
      throw new AppError(400, "CANNOT_SUSPEND_SELF", "Administrators cannot suspend their own account.");
    }

    return prisma.user.update({
      where: { id: targetUserId },
      data: { status }
    });
  },

  async deleteUser(targetUserId: string, adminUserId?: string) {
    if (adminUserId && targetUserId === adminUserId) {
      throw new AppError(400, "CANNOT_DELETE_SELF", "Administrators cannot delete their own account.");
    }

    return prisma.user.delete({
      where: { id: targetUserId }
    });
  },


  async listFeedbacks(page = 1, limit = 50, status?: string) {
    const skip = (page - 1) * limit;
    const whereClause = status ? { status } : {};

    const feedbacks = await prisma.feedback.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true, avatarUrl: true }
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, role: true, email: true }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    const total = await prisma.feedback.count({ where: whereClause });

    return {
      feedbacks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async updateFeedbackStatus(feedbackId: string, status: string) {
    return prisma.feedback.update({
      where: { id: feedbackId },
      data: { status }
    });
  }
};
