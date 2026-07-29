import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class LoanService {
  async getLoans(userId: string) {
    return prisma.loan.findMany({
      where: { userId },
    });
  }

  async addLoan(userId: string, data: any) {
    return prisma.loan.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async updateLoan(userId: string, id: string, data: any) {
    const existing = await prisma.loan.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');

    return prisma.loan.update({
      where: { id },
      data,
    });
  }

  async deleteLoan(userId: string, id: string) {
    const existing = await prisma.loan.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');

    await prisma.loan.delete({ where: { id } });
    return { message: 'Loan deleted successfully' };
  }

  calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
    if (annualRate === 0) return principal / tenureMonths;
    const monthlyRate = annualRate / 12 / 100;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return emi;
  }

  async processUpcomingEMIs() {
    try {
      const today = new Date();
      const currentDay = today.getDate();
      
      const activeLoans = await prisma.loan.findMany({
        where: {
          remainingMonths: { gt: 0 },
          dueDate: currentDay
        },
      });

      for (const loan of activeLoans) {
        const todayStr = new Date().toDateString();
        const updatedStr = new Date(loan.updatedAt).toDateString();
        
        if (updatedStr === todayStr) {
           logger.info(`EMI for loan ${loan.id} already processed today. Skipping.`);
           continue;
        }

        logger.info(`Processing EMI for loan ${loan.id}`);
        
        const monthlyRate = Number(loan.interestRate) / 12 / 100;
        const interestPortion = Number(loan.outstandingAmount) * monthlyRate;
        const principalPortion = Number(loan.emiAmount) - interestPortion;

        await prisma.loan.update({
          where: { id: loan.id },
          data: { 
            outstandingAmount: {
              decrement: Math.max(0, principalPortion)
            },
            remainingMonths: {
              decrement: 1
            }
          }
        });
      }
    } catch (error: any) {
      logger.error('Failed to process EMIs', { error: error.message });
    }
  }
}

export const loanService = new LoanService();
