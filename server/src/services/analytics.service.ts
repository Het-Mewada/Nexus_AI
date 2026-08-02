import { prisma } from "../config/database";
import { incomeRepository } from "../repositories/income.repository";
import { expenseRepository } from "../repositories/expense.repository";
import { getCurrentMonthRange, toNumber, getMonthName } from "../utils/helpers";

export class AnalyticsService {
  async getDashboardSummary(userId: string) {
    const { start, end } = getCurrentMonthRange();

    const [monthlyIncome, monthlyExpenses, totalIncome, totalExpenses, recentExpenses, upcomingBills, user] = await Promise.all([
      incomeRepository.sumByDateRange(userId, start, end),
      expenseRepository.sumByDateRange(userId, start, end),
      incomeRepository.sumTotal(userId),
      expenseRepository.sumTotal(userId),
      expenseRepository.getRecentTransactions(userId, 10),
      prisma.bill.findMany({
        where: { userId, isPaid: false, deletedAt: null, dueDate: { gte: new Date() } },
        orderBy: { dueDate: 'asc' },
        take: 3
      }),
      prisma.user.findUnique({ where: { id: userId } })
    ]);

    const initialBalance = toNumber(user?.initialBalance || 0);
    const income = toNumber(monthlyIncome);
    const expenses = toNumber(monthlyExpenses);
    const allTimeIncome = toNumber(totalIncome);
    const allTimeExpenses = toNumber(totalExpenses);
    const balance = initialBalance + allTimeIncome - allTimeExpenses;
    const savings = income > 0 ? ((income - expenses) / income) * 100 : 0;

    const categoryBreakdown = await expenseRepository.getCategoryBreakdown(userId, start, end);
    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    return {
      currentBalance: balance,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      savingsRate: Math.round(savings * 100) / 100,
      netCashFlow: balance,
      recentTransactions: recentExpenses,
      categoryBreakdown,
      topSpendingCategory: topCategory,
      upcomingBills,
    };
  }

  async getChartData(userId: string, year: number) {
    const [incomeMonthly, expenseMonthly] = await Promise.all([
      incomeRepository.getMonthlyTotals(userId, year),
      expenseRepository.getMonthlyTotals(userId, year),
    ]);

    const monthlyComparison = [];
    for (let i = 1; i <= 12; i++) {
      monthlyComparison.push({
        month: getMonthName(i),
        monthNumber: i,
        income: incomeMonthly[i] || 0,
        expense: expenseMonthly[i] || 0,
        cashFlow: (incomeMonthly[i] || 0) - (expenseMonthly[i] || 0),
      });
    }

    return {
      monthlyComparison,
      year,
    };
  }

  async getCashFlowData(userId: string, year: number) {
    const [incomeMonthly, expenseMonthly, user] = await Promise.all([
      incomeRepository.getMonthlyTotals(userId, year),
      expenseRepository.getMonthlyTotals(userId, year),
      prisma.user.findUnique({ where: { id: userId } })
    ]);

    const initialBalance = toNumber(user?.initialBalance || 0);
    let runningBalance = initialBalance;
    const cashFlow = [];

    for (let i = 1; i <= 12; i++) {
      const income = incomeMonthly[i] || 0;
      const expense = expenseMonthly[i] || 0;
      const net = income - expense;
      runningBalance += net;

      cashFlow.push({
        month: getMonthName(i),
        monthNumber: i,
        income,
        expense,
        net,
        runningBalance,
      });
    }

    return { cashFlow, year };
  }

  async getCategoryBreakdown(userId: string, year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    return expenseRepository.getCategoryBreakdown(userId, start, end);
  }
}

export const analyticsService = new AnalyticsService();
