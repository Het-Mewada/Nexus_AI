import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class TaxService {
  async list(userId: string) {
    return prisma.taxProfile.findMany({
      where: { userId },
      orderBy: { financialYear: 'desc' },
    });
  }

  async getById(id: string, userId: string) {
    const profile = await prisma.taxProfile.findFirst({ where: { id, userId } });
    if (!profile) throw new AppError(404, 'TAX_PROFILE_NOT_FOUND', 'Tax profile not found');
    return profile;
  }

  async create(userId: string, data: {
    financialYear: string;
    estimatedIncome?: number;
    totalDeductions?: number;
    estimatedTax?: number;
    taxPaid?: number;
    taxRegime?: string;
    basicSalary?: number;
    hra?: number;
    lta?: number;
    specialAllowance?: number;
    pfDeduction?: number;
    ptDeduction?: number;
    investments80c?: number;
    medical80d?: number;
    educationLoan80e?: number;
    homeLoanInterest24b?: number;
    nps80ccd?: number;
    otherDeductions?: number;
  }) {
    const isNewRegime = (data.taxRegime || 'NEW') === 'NEW';

    return prisma.taxProfile.create({
      data: {
        userId,
        financialYear: data.financialYear,
        estimatedIncome: data.estimatedIncome || 0,
        totalDeductions: data.totalDeductions || 0,
        estimatedTax: data.estimatedTax || 0,
        taxPaid: data.taxPaid || 0,
        taxRegime: data.taxRegime || 'NEW',
        basicSalary: data.basicSalary || 0,
        hra: isNewRegime ? 0 : (data.hra || 0),
        lta: isNewRegime ? 0 : (data.lta || 0),
        specialAllowance: data.specialAllowance || 0,
        pfDeduction: data.pfDeduction || 0,
        ptDeduction: data.ptDeduction || 0,
        investments80c: isNewRegime ? 0 : Math.min(150000, data.investments80c || 0),
        medical80d: isNewRegime ? 0 : (data.medical80d || 0),
        educationLoan80e: data.educationLoan80e || 0,
        homeLoanInterest24b: data.homeLoanInterest24b || 0,
        nps80ccd: isNewRegime ? 0 : Math.min(50000, data.nps80ccd || 0),
        otherDeductions: data.otherDeductions || 0,
      },
    });
  }

  async update(id: string, userId: string, data: {
    financialYear?: string;
    estimatedIncome?: number;
    totalDeductions?: number;
    estimatedTax?: number;
    taxPaid?: number;
    taxRegime?: string;
    basicSalary?: number;
    hra?: number;
    lta?: number;
    specialAllowance?: number;
    pfDeduction?: number;
    ptDeduction?: number;
    investments80c?: number;
    medical80d?: number;
    educationLoan80e?: number;
    homeLoanInterest24b?: number;
    nps80ccd?: number;
    otherDeductions?: number;
  }) {
    const existing = await prisma.taxProfile.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'TAX_PROFILE_NOT_FOUND', 'Tax profile not found');

    const isNewRegime = (data.taxRegime || existing.taxRegime) === 'NEW';
    const finalData = { ...data };
    
    if (isNewRegime) {
      finalData.hra = 0;
      finalData.lta = 0;
      finalData.medical80d = 0;
      finalData.investments80c = 0;
      finalData.nps80ccd = 0;
    } else {
      if (finalData.investments80c !== undefined) finalData.investments80c = Math.min(150000, finalData.investments80c);
      if (finalData.nps80ccd !== undefined) finalData.nps80ccd = Math.min(50000, finalData.nps80ccd);
    }

    return prisma.taxProfile.update({
      where: { id },
      data: finalData,
    });
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.taxProfile.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'TAX_PROFILE_NOT_FOUND', 'Tax profile not found');

    await prisma.taxProfile.delete({ where: { id } });
    return { message: 'Tax profile deleted successfully' };
  }
}

export const taxService = new TaxService();
