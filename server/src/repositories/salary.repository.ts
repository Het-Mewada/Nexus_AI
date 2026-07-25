import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

export class SalaryRepository {
  async findMany(userId: string) {
    return prisma.salaryRecord.findMany({
      where: { userId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  async findById(id: string, userId: string) {
    return prisma.salaryRecord.findFirst({
      where: { id, userId },
    });
  }

  async findByMonthYear(userId: string, month: number, year: number) {
    return prisma.salaryRecord.findUnique({
      where: {
        userId_month_year: { userId, month, year },
      },
    });
  }

  async create(data: Prisma.SalaryRecordUncheckedCreateInput) {
    return prisma.salaryRecord.create({ data });
  }

  async update(id: string, userId: string, data: Prisma.SalaryRecordUncheckedUpdateInput) {
    return prisma.salaryRecord.updateMany({
      where: { id, userId },
      data,
    });
  }

  async delete(id: string, userId: string) {
    return prisma.salaryRecord.deleteMany({
      where: { id, userId },
    });
  }
}

export const salaryRepository = new SalaryRepository();
