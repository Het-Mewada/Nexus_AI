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
        where: { userId, quantity: { gt: 0 } },
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

  async getInvestmentCategory(userId: string, tx: any) {
    let category = await tx.category.findFirst({
      where: { userId, name: 'Investments' }
    });
    if (!category) {
      category = await tx.category.create({
        data: {
          userId,
          name: 'Investments',
          color: '#10b981',
          icon: 'trending-up',
        }
      });
    }
    return category.id;
  }

  async addInvestment(userId: string, data: any) {
    const { symbol, quantity, averagePrice, type, name, currency, investedAmount, currentPrice, notes } = data;
    
    if (quantity === undefined || Number(quantity) <= 0) {
      throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must be greater than zero');
    }
    if (averagePrice === undefined || Number(averagePrice) < 0) {
      throw new AppError(400, 'INVALID_PRICE', 'Average price cannot be negative');
    }

    return prisma.$transaction(async (tx) => {
      const newQuantity = new Decimal(quantity);
      const newPrice = new Decimal(averagePrice);
      const newInvestedAmount = newQuantity.mul(newPrice);
      
      const incomes = await tx.income.aggregate({
        where: { userId },
        _sum: { amount: true }
      });
      const expenses = await tx.expense.aggregate({
        where: { userId },
        _sum: { amount: true }
      });
      const totalIncome = new Decimal(incomes._sum.amount || 0);
      const totalExpense = new Decimal(expenses._sum.amount || 0);
      const availableBalance = totalIncome.sub(totalExpense);
      
      if (availableBalance.lessThan(newInvestedAmount)) {
        throw new AppError(400, 'INSUFFICIENT_FUNDS', `Not enough balance. You need ₹${newInvestedAmount.toNumber().toFixed(2)} but have ₹${availableBalance.toNumber().toFixed(2)}`);
      }

      const categoryId = await this.getInvestmentCategory(userId, tx);

      await tx.expense.create({
        data: {
          userId,
          categoryId,
          amount: newInvestedAmount,
          merchant: `Investment: ${symbol}`,
          date: new Date(),
          paymentMethod: 'bank_transfer',
          notes: `Purchased ${newQuantity.toNumber()} shares of ${symbol} at ₹${newPrice.toNumber()}`
        }
      });
      
      let investment = await tx.investment.findFirst({
        where: { userId, symbol, type }
      });

      if (investment) {
        const existingQuantity = new Decimal(investment.quantity);
        const existingInvestedAmount = new Decimal(investment.investedAmount);
        
        const updatedQuantity = existingQuantity.add(newQuantity);
        const updatedInvestedAmount = existingInvestedAmount.add(newInvestedAmount);
        const updatedAveragePrice = updatedInvestedAmount.div(updatedQuantity);
        
        investment = await tx.investment.update({
          where: { id: investment.id },
          data: {
            quantity: updatedQuantity,
            investedAmount: updatedInvestedAmount,
            averagePrice: updatedAveragePrice,
            currentPrice: currentPrice || investment.currentPrice
          }
        });
      } else {
        investment = await tx.investment.create({
          data: {
            userId,
            symbol,
            type,
            name,
            quantity: newQuantity,
            averagePrice: newPrice,
            investedAmount: newInvestedAmount,
            currentPrice: currentPrice || newPrice,
            currency: currency || 'INR',
            notes
          }
        });
      }

      await tx.investmentTransaction.create({
        data: {
          userId,
          investmentId: investment.id,
          type: 'BUY',
          quantity: newQuantity,
          price: newPrice,
          totalAmount: newInvestedAmount,
        }
      });

      return investment;
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

  async sellInvestment(userId: string, data: { symbol: string, quantity: number, currentPrice: number, executionPrice?: number }) {
    const { symbol, quantity, currentPrice, executionPrice } = data;
    const sellPrice = executionPrice !== undefined ? executionPrice : currentPrice;
    
    if (quantity === undefined || Number(quantity) <= 0) {
      throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must be greater than zero');
    }
    if (sellPrice === undefined || Number(sellPrice) < 0) {
      throw new AppError(400, 'INVALID_PRICE', 'Execution price cannot be negative');
    }

    return prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findFirst({
        where: { userId, symbol },
      });

      if (!investment) {
        throw new AppError(404, 'INVESTMENT_NOT_FOUND', `You don't own ${symbol}`);
      }

      const totalOwned = new Decimal(investment.quantity);
      const qtyToSell = new Decimal(quantity);

      if (totalOwned.lessThan(qtyToSell)) {
        throw new AppError(400, 'INSUFFICIENT_SHARES', `You only own ${totalOwned.toNumber()} shares of ${symbol}`);
      }

      const remainingQty = totalOwned.sub(qtyToSell);
      const sPrice = new Decimal(sellPrice);
      const avgPrice = new Decimal(investment.averagePrice);
      const newInvestedAmount = remainingQty.mul(avgPrice);
      
      await tx.investment.update({
        where: { id: investment.id },
        data: {
          quantity: remainingQty,
          investedAmount: remainingQty.lte(0) ? 0 : newInvestedAmount,
          currentPrice: currentPrice
        }
      });

      const totalAmountSold = qtyToSell.mul(sPrice);

      await tx.investmentTransaction.create({
        data: {
          userId,
          investmentId: investment.id,
          type: 'SELL',
          quantity: qtyToSell,
          price: sPrice,
          totalAmount: totalAmountSold,
        }
      });

      await tx.income.create({
        data: {
          userId,
          amount: totalAmountSold,
          source: `Investment Return: ${symbol}`,
          date: new Date(),
          notes: `Sold ${qtyToSell.toNumber()} shares of ${symbol} at ₹${sPrice.toNumber()}`
        }
      });

      return { message: `Successfully sold ${quantity} shares of ${symbol}` };
    });
  }

  async getTransactions(userId: string, symbol?: string) {
    return prisma.investmentTransaction.findMany({
      where: {
        userId,
        ...(symbol ? { investment: { symbol } } : {})
      },
      orderBy: { date: 'desc' },
      include: {
        investment: {
          select: { symbol: true, name: true, type: true }
        }
      }
    });
  }
}

export const portfolioService = new PortfolioService();
