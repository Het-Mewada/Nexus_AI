import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

export class CategoryRepository {
  async findAll(userId: string) {
    return prisma.category.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isDefault: true },
          { userId },
        ],
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  async findById(id: string) {
    return prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByName(userId: string, name: string) {
    return prisma.category.findFirst({
      where: {
        deletedAt: null,
        name: { equals: name, mode: "insensitive" },
        OR: [{ isDefault: true }, { userId }],
      },
    });
  }

  async create(data: Prisma.CategoryUncheckedCreateInput) {
    return prisma.category.create({ data });
  }

  async update(id: string, userId: string, data: Prisma.CategoryUncheckedUpdateInput) {
    return prisma.category.updateMany({
      where: { id, userId, isDefault: false, deletedAt: null },
      data,
    });
  }

  async softDelete(id: string, userId: string) {
    return prisma.category.updateMany({
      where: { id, userId, isDefault: false, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async hasExpenses(id: string) {
    const count = await prisma.expense.count({
      where: { categoryId: id, deletedAt: null },
    });
    return count > 0;
  }
}

export const categoryRepository = new CategoryRepository();
