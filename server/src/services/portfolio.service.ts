import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import YF from 'yahoo-finance2';
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
        const invested = Number(inv.investedAmount);
        totalInvested += invested;

        let value = invested;
        let currentLivePrice = inv.currentPrice ? Number(inv.currentPrice) : undefined;
        
        if (inv.symbol && liveQuotes[inv.symbol]) {
            currentLivePrice = liveQuotes[inv.symbol];
        }

        if (currentLivePrice && inv.quantity) {
          value = currentLivePrice * Number(inv.quantity);
        }
        
        currentValue += value;
        assetAllocation[inv.type] = (assetAllocation[inv.type] || 0) + value;

        return {
            ...inv,
            currentPrice: currentLivePrice, // Override with live price
            currentValue: value,
            absoluteReturn: value - invested,
            absoluteReturnPercentage: invested > 0 ? ((value - invested) / invested) * 100 : 0
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
    
    // Find all investments for this symbol owned by the user, sorted by oldest first
    const investments = await prisma.investment.findMany({
      where: { userId, symbol },
      orderBy: { createdAt: 'asc' }
    });

    let totalOwned = investments.reduce((acc, inv) => acc + Number(inv.quantity), 0);
    if (totalOwned < quantity) {
      throw new AppError(400, 'INSUFFICIENT_SHARES', `You only own ${totalOwned} shares of ${symbol}`);
    }

    let remainingToSell = quantity;

    for (const inv of investments) {
      if (remainingToSell <= 0) break;

      const invQty = Number(inv.quantity);
      if (invQty <= remainingToSell) {
        // Sell entire lot
        await prisma.investment.delete({ where: { id: inv.id } });
        remainingToSell -= invQty;
      } else {
        // Sell partial lot
        const newQty = invQty - remainingToSell;
        const averagePrice = Number(inv.averagePrice);
        const newInvestedAmount = newQty * averagePrice;
        
        await prisma.investment.update({
          where: { id: inv.id },
          data: {
            quantity: newQty,
            investedAmount: newInvestedAmount,
            currentPrice: currentPrice
          }
        });
        remainingToSell = 0;
      }
    }

    return { message: `Successfully sold ${quantity} shares of ${symbol}` };
  }
}

export const portfolioService = new PortfolioService();
