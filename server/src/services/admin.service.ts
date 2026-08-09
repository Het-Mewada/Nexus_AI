import { prisma } from "../config/database";

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

  async updateUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED") {
    return prisma.user.update({
      where: { id: userId },
      data: { status }
    });
  },

  async deleteUser(userId: string) {
    // Optionally delete from Supabase Auth as well via supabaseAdmin
    // But deleting in Prisma with Cascade will delete most data.
    return prisma.user.delete({
      where: { id: userId }
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
