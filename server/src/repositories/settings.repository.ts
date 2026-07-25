import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

export class SettingsRepository {
  async findByUserId(userId: string) {
    return prisma.userSettings.findUnique({
      where: { userId },
    });
  }

  async upsert(userId: string, data: Partial<Prisma.UserSettingsUncheckedUpdateInput>) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      } as Prisma.UserSettingsUncheckedCreateInput,
    });
  }
}

export const settingsRepository = new SettingsRepository();
