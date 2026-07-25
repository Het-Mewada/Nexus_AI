import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";
import { aiService } from "./ai.service";
import { opportunityService } from "./opportunity.service";
import { spendingBehaviorService } from "./spending-behavior.service";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class AiCfoService {
  /**
   * Analyzes the user's financial profile and generates proactive CFO recommendations.
   * Runs periodically via BullMQ, or triggered manually.
   */
  async generateProactiveRecommendations(userId: string) {
    try {
      const context = await aiService.getUserFinancialContext(userId);
      
      const prompt = `
        You are an elite, proactive AI Chief Financial Officer (CFO).
        Review the following financial profile for ${context.month} ${context.year}:
        
        Income: ${context.totalIncome} ${context.currency}
        Spent: ${context.totalSpent} ${context.currency}
        Category Breakdown: ${JSON.stringify(context.categoryTotals)}
        Net Worth: ${context.netWorth} ${context.currency}
        
        Budgets: ${JSON.stringify(context.budgets)}
        Goals: ${JSON.stringify(context.goals)}
        Bills: ${JSON.stringify(context.bills)}
        Investments: ${JSON.stringify(context.investments.breakdown)}
        Debts: ${JSON.stringify(context.loans.breakdown)} (Total EMI: ${context.loans.monthlyEMI})
        Taxes: ${JSON.stringify(context.taxes)}

        Based on this data, generate 2-3 strategic, long-term financial recommendations.
        Look for: Salary optimization, expense reduction, investment allocation, emergency fund planning, tax-saving, credit utilization.

        Format your response as a strict JSON array of objects.
        Each object must have exactly these keys:
        - "category": (String) Must be one of: "SPENDING", "INVESTMENT", "DEBT", "TAX", "SAVINGS", "GENERAL"
        - "title": (String) Short, punchy title for the recommendation
        - "description": (String) Detailed explanation of what the user should do and why
        - "impactAmount": (Number) The estimated positive monetary impact in ${context.currency}, or 0 if unknown
        - "confidenceScore": (Number) Decimal between 0.00 and 1.00 indicating your confidence
        - "reasoning": (String) A brief internal reasoning explaining the calculation or logic
        
        Do not include markdown blocks or any text outside the JSON array.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      if (!response.text) return [];
      
      const recommendationsData = JSON.parse(response.text) as any[];
      
      const createdRecommendations = await Promise.all(
        recommendationsData.map(async (rec) => {
          return prisma.aiCfoRecommendation.create({
            data: {
              userId,
              category: rec.category,
              title: rec.title,
              description: rec.description,
              impactAmount: rec.impactAmount,
              confidenceScore: rec.confidenceScore,
              reasoning: rec.reasoning,
              dataSources: { source: "cfo_periodic_scan" }
            }
          });
        })
      );
      
      // Also run the Opportunity Engine asynchronously
      opportunityService.analyzeOpportunities(userId).catch((err) => {
        logger.error("Opportunity Engine failed during CFO scan", { error: err.message });
      });

      return createdRecommendations;
    } catch (error: any) {
      logger.error("Error generating AI CFO Recommendations", { message: error.message, stack: error.stack });
      throw error;
    }
  }

  async getRecommendations(userId: string) {
    return prisma.aiCfoRecommendation.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" }
    });
  }

  async updateRecommendationStatus(id: string, userId: string, status: "ACCEPTED" | "DISMISSED" | "POSTPONED") {
    return prisma.aiCfoRecommendation.update({
      where: { id, userId }, // Ensure user owns the recommendation
      data: { status }
    });
  }
}

export const aiCfoService = new AiCfoService();
