import { prisma } from '../config/database';
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class SpendingBehaviorService {
  async analyzeUserBehavior(userId: string) {
    try {
      // Fetch recent expenses (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const expenses = await prisma.expense.findMany({
        where: { userId, deletedAt: null, date: { gte: ninetyDaysAgo } },
        include: { category: true },
        orderBy: { date: 'desc' },
      });

      if (expenses.length < 5) {
        return { message: "Not enough data for spending behavior analysis." };
      }

      // Format expenses for the AI
      const expenseSummary = expenses.map(e => ({
        date: e.date.toISOString().split('T')[0],
        merchant: e.merchant,
        amount: Number(e.amount),
        category: e.category.name,
        isRecurring: e.isRecurring,
      }));

      const prompt = `You are an AI Spending Behavior Analyst. Be completely RAW, direct, candid, and blunt. Do NOT sugarcoat or butter up anything. Say what is strictly correct, real, and factual. Analyze the following 90-day transaction history to identify patterns such as lifestyle inflation, impulse buying, subscription waste, or saving habits.

Transactions:
${JSON.stringify(expenseSummary)}

Identify 1 to 3 key insights. For each insight, provide:
1. type: "ANOMALY", "SUBSCRIPTION_WASTE", "SAVINGS_TIP", or "BUDGET_WARNING"
2. severity: "INFO", "WARNING", or "CRITICAL"
3. title: A short, catchy title
4. message: A detailed explanation of the behavior and what to do about it

Return a JSON array of these insights (no markdown blocks, just raw JSON). Example:
[
  {
    "type": "SUBSCRIPTION_WASTE",
    "severity": "WARNING",
    "title": "Unused Streaming Services",
    "message": "You have paid for Netflix and Hulu but haven't used them. Consider cancelling one."
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (!response.text) {
        throw new Error("AI returned empty response");
      }

      const insights: any[] = JSON.parse(response.text);

      // Save insights to DB
      const createdInsights = await Promise.all(
        insights.map(async (insight) => {
          // Check if a similar insight already exists and is active
          const existing = await prisma.aiInsight.findFirst({
            where: {
              userId,
              type: insight.type,
              title: insight.title,
              isDismissed: false,
            },
          });

          if (!existing) {
            return prisma.aiInsight.create({
              data: {
                userId,
                type: insight.type,
                severity: insight.severity,
                title: insight.title,
                message: insight.message,
              },
            });
          }
          return null;
        })
      );

      return {
        message: "Behavior analysis complete",
        newInsightsCount: createdInsights.filter(i => i !== null).length,
      };
    } catch (error: any) {
      logger.error('Error analyzing spending behavior', { userId, message: error.message });
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.status === 'RESOURCE_EXHAUSTED') {
        throw new AppError(429, 'RATE_LIMIT_EXCEEDED', 'AI service is currently busy due to high demand. Please try again later.');
      }
      throw new AppError(500, 'AI_ANALYSIS_FAILED', 'Failed to analyze spending behavior');
    }
  }

  async getBehaviorInsights(userId: string) {
    return prisma.aiInsight.findMany({
      where: { userId, isDismissed: false },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const spendingBehaviorService = new SpendingBehaviorService();
