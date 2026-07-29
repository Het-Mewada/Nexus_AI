import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import YF from 'yahoo-finance2';
import { Decimal } from '@prisma/client/runtime/library';
const yahooFinance = new YF();

export class PortfolioService {
  async getPortfolioSummary(userId: string) {
    try {
      const investments = await prisma.investment.findMany({
        where: { userId },
      });

      // Get unique symbols for market-linked investments
      const symbols = [...new Set(investments.filter(i => i.symbol).map(i => i.symbol!))];
      
      const liveQuotes: Record<string, number> = {};
      
      if (symbols.length > 0) {
        try {
          const quotes = await yahooFinance.quote(symbols);
          const quotesArray = Array.isArray(quotes) ? quotes : [quotes];
          quotesArray.forEach((q: any) => {
            if (q.symbol && q.regularMarketPrice) {
              liveQuotes[q.symbol] = q.regularMarketPrice;
            }
          });
        } catch (error) {
          logger.warn(`Failed to fetch live quotes for user ${userId}:`, error);
        }
      }

      let totalInvested = 0;
      let currentValue = 0;
      
      const assetAllocation: Record<string, number> = {};

      const updatedInvestments = investments.map((inv) => {
        let currentLivePrice = inv.currentPrice ? Number(inv.currentPrice) : undefined;
        
        if (inv.symbol && liveQuotes[inv.symbol]) {
            currentLivePrice = liveQuotes[inv.symbol];
        }

        const invested = new Decimal(inv.investedAmount);
        const quantity = new Decimal(inv.quantity);
        const currentPrice = new Decimal(currentLivePrice ?? inv.currentPrice ?? 0);
        
        const value = (currentLivePrice !== undefined) ? currentPrice.mul(quantity) : invested;
        const absoluteReturn = value.sub(invested);

        const valueNum = value.toNumber();
        const investedNum = invested.toNumber();

        totalInvested += investedNum;
        currentValue += valueNum;
        assetAllocation[inv.type] = (assetAllocation[inv.type] || 0) + valueNum;

        return {
            ...inv,
            currentPrice: currentLivePrice,
            currentValue: valueNum,
            absoluteReturn: absoluteReturn.toNumber(),
            absoluteReturnPercentage: investedNum > 0 ? absoluteReturn.div(invested).mul(100).toNumber() : 0
        };
      });

      const absoluteReturn = currentValue - totalInvested;
      const absoluteReturnPercentage = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

      return {
        totalInvested,
        currentValue,
        absoluteReturn,
        absoluteReturnPercentage,
        assetAllocation,
        investments: updatedInvestments,
      };
    } catch (error: any) {
      logger.error(`Failed to sync portfolio for user ${userId}`, { error: error.message, userId });
      throw new Error('Failed to fetch portfolio summary');
    }
  }

  async addInvestment(userId: string, data: any) {
    return prisma.investment.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async updateInvestment(userId: string, id: string, data: any) {
    const existing = await prisma.investment.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'INVESTMENT_NOT_FOUND', 'Investment not found');

    return prisma.investment.update({
      where: { id },
      data,
    });
  }

  async deleteInvestment(userId: string, id: string) {
    const existing = await prisma.investment.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError(404, 'INVESTMENT_NOT_FOUND', 'Investment not found');

    await prisma.investment.delete({ where: { id } });
    return { message: 'Investment deleted successfully' };
  }

  async sellInvestment(userId: string, data: { symbol: string, quantity: number, currentPrice: number }) {
    const { symbol, quantity, currentPrice } = data;
    
    return prisma.$transaction(async (tx) => {
      const investments = await tx.investment.findMany({
        where: { userId, symbol },
        orderBy: { createdAt: 'asc' }
      });

      let totalOwned = new Decimal(0);
      for (const inv of investments) {
        totalOwned = totalOwned.add(inv.quantity);
      }

      if (totalOwned.lessThan(quantity)) {
        throw new AppError(400, 'INSUFFICIENT_SHARES', `You only own ${totalOwned.toNumber()} shares of ${symbol}`);
      }

      let remainingToSell = new Decimal(quantity);

      for (const inv of investments) {
        if (remainingToSell.lte(0)) break;

        const invQty = new Decimal(inv.quantity);
        if (invQty.lte(remainingToSell)) {
          await tx.investment.delete({ where: { id: inv.id } });
          remainingToSell = remainingToSell.sub(invQty);
        } else {
          const newQty = invQty.sub(remainingToSell);
          const averagePrice = new Decimal(inv.averagePrice);
          const newInvestedAmount = newQty.mul(averagePrice);
          
          await tx.investment.update({
            where: { id: inv.id },
            data: {
              quantity: newQty,
              investedAmount: newInvestedAmount,
              currentPrice: currentPrice
            }
          });
          remainingToSell = new Decimal(0);
        }
      }

      return { message: `Successfully sold ${quantity} shares of ${symbol}` };
    });
  }
}

export const portfolioService = new PortfolioService();
