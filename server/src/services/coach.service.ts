import { prisma } from '../config/database';
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { financialAgentService } from './financial-agent.service';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class CoachService {
  /**
   * Get a personalized daily tip based on the user's financial state.
   */
  async getDailyTip(userId: string) {
    try {
      const context = await financialAgentService.getUserFinancialContext(userId);

      const prompt = `You are a warm, encouraging AI Wealth Coach. Generate ONE concise daily financial tip for this user.

USER DATA:
- Savings Rate: ${context.savingsRate.toFixed(1)}%
- Monthly Spend: ${context.totalSpent} ${context.currency}
- Net Worth: ${context.netWorth} ${context.currency}
- Active Subscriptions Cost: ${context.monthlySubCost} ${context.currency}/month
- Debt: ${context.loans.total} ${context.currency} (EMI: ${context.loans.monthlyEMI})
- Goals: ${JSON.stringify(context.goals)}

Return a JSON object with:
{ "tip": "The tip text (2-3 sentences, actionable)", "category": "SAVING|SPENDING|INVESTING|DEBT|GENERAL" }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (!response.text) return { tip: 'Review your spending this week and find one expense you can reduce.', category: 'GENERAL' };
      return JSON.parse(response.text);
    } catch (error: any) {
      logger.error('Failed to generate daily tip', { userId, message: error.message });
      return { tip: 'Set a small savings goal today — even ₹100 counts!', category: 'SAVING' };
    }
  }

  /**
   * Generate a weekly financial review.
   */
  async getWeeklyReview(userId: string) {
    try {
      const context = await financialAgentService.getUserFinancialContext(userId);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const weekExpenses = await prisma.expense.findMany({
        where: { userId, deletedAt: null, date: { gte: oneWeekAgo } },
        include: { category: true },
      });
      const weekTotal = weekExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const weekCategories: Record<string, number> = {};
      weekExpenses.forEach((e) => {
        weekCategories[e.category.name] = (weekCategories[e.category.name] || 0) + Number(e.amount);
      });

      const weekIncomes = await prisma.income.findMany({
        where: { userId, deletedAt: null, date: { gte: oneWeekAgo } },
      });
      const weekIncomeTotal = weekIncomes.reduce((s, i) => s + Number(i.amount), 0);

      const prompt = `You are an AI Wealth Coach providing a weekly financial review.

THIS WEEK'S DATA:
- Income: ${weekIncomeTotal} ${context.currency}
- Spent: ${weekTotal} ${context.currency}
- Category Breakdown: ${JSON.stringify(weekCategories)}
- Transactions Count: ${weekExpenses.length}

MONTH-TO-DATE:
- Total Income: ${context.totalIncome} ${context.currency}
- Total Spent: ${context.totalSpent} ${context.currency}
- Savings Rate: ${context.savingsRate.toFixed(1)}%
- Budget Status: ${JSON.stringify(context.budgets)}

Generate a weekly review with this JSON structure:
{
  "summary": "2-3 sentence overview of the week",
  "weekSpent": ${weekTotal},
  "weekIncome": ${weekIncomeTotal},
  "topCategory": "category name",
  "topCategoryAmount": 0,
  "savingsRate": ${context.savingsRate.toFixed(1)},
  "strengths": ["1-2 positive observations"],
  "improvements": ["1-2 actionable suggestions"],
  "weekScore": 75
}

weekScore: 0-100 based on spending discipline, savings rate, and budget adherence.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (!response.text) throw new Error('Empty response');
      return JSON.parse(response.text);
    } catch (error: any) {
      logger.error('Failed to generate weekly review', { userId, message: error.message });
      return {
        summary: 'Unable to generate review at this time.',
        weekSpent: 0, weekIncome: 0, topCategory: 'N/A', topCategoryAmount: 0,
        savingsRate: 0, strengths: [], improvements: [], weekScore: 0,
      };
    }
  }

  /**
   * Get all available challenges.
   */
  async getChallenges() {
    return prisma.coachingChallenge.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a user's active and completed challenges.
   */
  async getUserChallenges(userId: string) {
    return prisma.coachingProgress.findMany({
      where: { userId },
      include: { challenge: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Start a challenge.
   */
  async startChallenge(userId: string, challengeId: string) {
    const existing = await prisma.coachingProgress.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });
    if (existing) {
      throw Object.assign(new Error('You have already joined this challenge'), { statusCode: 400 });
    }

    return prisma.coachingProgress.create({
      data: { userId, challengeId, status: 'ACTIVE', progressPct: 0 },
      include: { challenge: true },
    });
  }

  /**
   * Update challenge progress.
   */
  async updateProgress(userId: string, challengeId: string, progressPct: number) {
    const progress = await prisma.coachingProgress.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });
    if (!progress) throw Object.assign(new Error('Challenge not found'), { statusCode: 404 });

    const isComplete = progressPct >= 100;
    return prisma.coachingProgress.update({
      where: { userId_challengeId: { userId, challengeId } },
      data: {
        progressPct: Math.min(progressPct, 100),
        status: isComplete ? 'COMPLETED' : 'ACTIVE',
        completedAt: isComplete ? new Date() : null,
      },
      include: { challenge: true },
    });
  }

  /**
   * Seed default coaching challenges if none exist.
   */
  async seedDefaultChallenges() {
    const count = await prisma.coachingChallenge.count();
    if (count > 0) return;

    const defaults = [
      { title: 'No-Spend Weekend', description: 'Avoid all non-essential spending for an entire weekend. Pack meals, use free entertainment, and see how much you save.', category: 'SPENDING', difficulty: 'EASY', durationDays: 2 },
      { title: '30-Day Savings Sprint', description: 'Save at least 20% of your income this month by cutting unnecessary expenses and automating transfers.', category: 'SAVING', difficulty: 'MEDIUM', durationDays: 30 },
      { title: 'Subscription Audit', description: 'Review all active subscriptions. Cancel at least one you haven\'t used in the past 30 days.', category: 'SPENDING', difficulty: 'EASY', durationDays: 7 },
      { title: 'Debt Snowball Kickstart', description: 'Make one extra payment toward your smallest outstanding loan this month.', category: 'DEBT', difficulty: 'MEDIUM', durationDays: 30 },
      { title: 'Emergency Fund Builder', description: 'Set up an emergency fund goal and contribute at least 5% of your income toward it.', category: 'SAVING', difficulty: 'EASY', durationDays: 30 },
      { title: 'Investment Starter', description: 'Research and make your first investment (stock, mutual fund, or SIP) this week.', category: 'INVESTING', difficulty: 'MEDIUM', durationDays: 7 },
      { title: 'Budget Master', description: 'Create budgets for your top 3 spending categories and stay within them for 2 weeks.', category: 'BUDGETING', difficulty: 'HARD', durationDays: 14 },
      { title: 'Expense Tracker Streak', description: 'Log every single expense for 7 consecutive days without missing one.', category: 'BUDGETING', difficulty: 'EASY', durationDays: 7 },
    ];

    await prisma.coachingChallenge.createMany({ data: defaults });
    logger.info('Seeded default coaching challenges');
  }
}

export const coachService = new CoachService();
