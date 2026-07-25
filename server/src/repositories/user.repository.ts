import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { settings: true },
    });
  }

  async findBySupabaseId(supabaseId: string) {
    return prisma.user.findUnique({
      where: { supabaseId },
      include: { settings: true },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      include: { settings: true },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      include: { settings: true },
    });
  }

  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const userRepository = new UserRepository();
