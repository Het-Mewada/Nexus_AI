import { salaryRepository } from "../repositories/salary.repository";
import { AppError } from "../middleware/errorHandler";
import { calculateExpectedSalary } from "../utils/helpers";
import { prisma } from "../config/database";

export class SalaryService {
  async getLeaveBalance(userId: string) {
    const leaveBalance = await prisma.leaveBalance.findUnique({
      where: { userId }
    });
    
    const accruedCL = leaveBalance ? Number(leaveBalance.casualLeaves) : 0;
    const accruedSL = leaveBalance ? Number(leaveBalance.sickLeaves) : 0;

    const records = await prisma.salaryRecord.findMany({ where: { userId } });
    const takenCL = records.reduce((sum, r) => sum + r.leaves, 0);
    const takenHalfDays = records.reduce((sum, r) => sum + r.halfDays, 0);
    const takenSL = takenHalfDays / 2;

    return {
      casualLeaves: Math.max(0, accruedCL - takenCL),
      sickLeaves: Math.max(0, accruedSL - takenSL)
    };
  }

  async list(userId: string) {
    const records = await salaryRepository.findMany(userId);
    const balance = await this.getLeaveBalance(userId);
    return { records, balance };
  }

  async getById(id: string, userId: string) {
    const record = await salaryRepository.findById(id, userId);
    if (!record) throw new AppError(404, "SALARY_NOT_FOUND", "Salary record not found");
    return record;
  }

  async createOrUpdate(userId: string, data: {
    month: number;
    year: number;
    baseSalary: number;
    leaves?: number;
    halfDays?: number;
    bonus?: number;
    otherDeductions?: number;
    actualCredited?: number;
    creditedDate?: Date;
    discrepancyReason?: string;
  }) {
    const leaves = data.leaves || 0;
    const halfDays = data.halfDays || 0;
    const bonus = data.bonus || 0;
    const otherDeductions = data.otherDeductions || 0;

    const currentBalance = await this.getLeaveBalance(userId);
    const existing = await salaryRepository.findByMonthYear(userId, data.month, data.year);
    
    const previouslyTakenCL = existing ? existing.leaves : 0;
    const previouslyTakenSL = existing ? existing.halfDays / 2 : 0;

    const actualAvailableCL = currentBalance.casualLeaves + previouslyTakenCL;
    const actualAvailableSL = currentBalance.sickLeaves + previouslyTakenSL;

    const unpaidCL = Math.max(0, leaves - actualAvailableCL);
    const SLTaken = halfDays / 2;
    const unpaidSL = Math.max(0, SLTaken - actualAvailableSL);
    const unpaidHalfDays = unpaidSL * 2;

    const expectedSalary = calculateExpectedSalary(
      data.baseSalary,
      unpaidCL,
      unpaidHalfDays,
      bonus,
      otherDeductions,
      data.year,
      data.month
    );

    let record;
    if (existing) {
      record = await prisma.salaryRecord.update({
        where: { id: existing.id },
        data: {
          baseSalary: data.baseSalary,
          leaves,
          halfDays,
          bonus,
          otherDeductions,
          expectedSalary,
          actualCredited: data.actualCredited,
          creditedDate: data.creditedDate ? new Date(data.creditedDate) : null,
          discrepancyReason: data.discrepancyReason
        }
      });
    } else {
      record = await prisma.salaryRecord.create({
        data: {
          userId,
          month: data.month,
          year: data.year,
          baseSalary: data.baseSalary,
          leaves,
          halfDays,
          bonus,
          otherDeductions,
          expectedSalary,
          actualCredited: data.actualCredited,
          creditedDate: data.creditedDate ? new Date(data.creditedDate) : null,
          discrepancyReason: data.discrepancyReason
        }
      });
    }

    if (record.actualCredited && record.creditedDate) {
      await this.syncToIncome(record);
    }

    return record;
  }

  async update(id: string, userId: string, data: any) {
    const existing = await salaryRepository.findById(id, userId);
    if (!existing) throw new AppError(404, "SALARY_NOT_FOUND", "Salary record not found");

    return this.createOrUpdate(userId, {
      month: existing.month,
      year: existing.year,
      baseSalary: data.baseSalary ?? Number(existing.baseSalary),
      leaves: data.leaves ?? existing.leaves,
      halfDays: data.halfDays ?? existing.halfDays,
      bonus: data.bonus ?? Number(existing.bonus),
      otherDeductions: data.otherDeductions ?? Number(existing.otherDeductions),
      actualCredited: data.actualCredited ?? (existing as any).actualCredited,
      creditedDate: data.creditedDate ?? (existing as any).creditedDate,
      discrepancyReason: data.discrepancyReason ?? (existing as any).discrepancyReason
    });
  }

  private async syncToIncome(salaryRecord: any) {
    const sourceName = `Salary - ${salaryRecord.month}/${salaryRecord.year}`;
    const existingIncome = await prisma.income.findFirst({
      where: {
        userId: salaryRecord.userId,
        source: sourceName
      }
    });

    if (existingIncome) {
      await prisma.income.update({
        where: { id: existingIncome.id },
        data: {
          amount: salaryRecord.actualCredited,
          date: salaryRecord.creditedDate,
        }
      });
    } else {
      await prisma.income.create({
        data: {
          userId: salaryRecord.userId,
          amount: salaryRecord.actualCredited,
          source: sourceName,
          date: salaryRecord.creditedDate,
          notes: "Auto-synced from Salary record",
          isRecurring: false
        }
      });
    }

    await prisma.salaryRecord.update({
      where: { id: salaryRecord.id },
      data: { isSynced: true }
    });
  }

  async delete(id: string, userId: string) {
    const existing = await salaryRepository.findById(id, userId);
    if (!existing) throw new AppError(404, "SALARY_NOT_FOUND", "Salary record not found");
    const sourceName = `Salary - ${existing.month}/${existing.year}`;
    await prisma.$transaction([
      prisma.income.deleteMany({ where: { userId, source: sourceName } }),
      prisma.salaryRecord.delete({ where: { id } }),
    ]);
    return { message: "Salary record deleted successfully" };
  }
}

export const salaryService = new SalaryService();
