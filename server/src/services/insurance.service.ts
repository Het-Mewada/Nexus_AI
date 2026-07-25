import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class InsuranceService {
  async getInsurancePolicies(userId: string) {
    return prisma.insurance.findMany({
      where: { userId },
    });
  }

  async addInsurance(userId: string, data: any) {
    return prisma.insurance.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async updateInsurance(userId: string, id: string, data: any) {
    const existing = await prisma.insurance.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'INSURANCE_NOT_FOUND', 'Insurance not found');

    return prisma.insurance.update({
      where: { id },
      data,
    });
  }

  async deleteInsurance(userId: string, id: string) {
    const existing = await prisma.insurance.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'INSURANCE_NOT_FOUND', 'Insurance not found');

    await prisma.insurance.delete({ where: { id } });
    return { message: 'Insurance deleted successfully' };
  }

  async processUpcomingPremiums() {
    try {
      const activePolicies = await prisma.insurance.findMany({
        where: {
          renewalDate: {
            lte: new Date(),
          }
        },
      });

      for (const policy of activePolicies) {
        logger.info(`Processing Premium for insurance ${policy.id}`);
        
        if (policy.renewalDate) {
          const nextDate = new Date(policy.renewalDate);
          nextDate.setFullYear(nextDate.getFullYear() + 1); // Default to yearly renewal
          
          await prisma.insurance.update({
            where: { id: policy.id },
            data: { renewalDate: nextDate }
          });
        }
      }
    } catch (error: any) {
      logger.error('Failed to process insurance premiums', { error: error.message });
    }
  }
}

export const insuranceService = new InsuranceService();
