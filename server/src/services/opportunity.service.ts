import { prisma } from '../config/database';
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class OpportunityService {
  async analyzeOpportunities(userId: string) {
    try {
      const [loans, investments] = await Promise.all([
        prisma.loan.findMany({ where: { userId } }),
        prisma.investment.findMany({ where: { userId } }),
      ]);

      if (loans.length === 0 && investments.length === 0) {
        return { message: "No active loans or investments to analyze for opportunities." };
      }

      // Format data for AI
      const payload = {
        loans: loans.map(l => ({
          type: l.type,
          name: l.name,
          outstandingAmount: Number(l.outstandingAmount),
          interestRate: Number(l.interestRate),
        })),
        investments: investments.map(i => ({
          type: i.type,
          name: i.name,
          currentValue: Number(i.currentPrice || i.averagePrice) * Number(i.quantity),
        })),
      };

      const prompt = `You are an AI Opportunity Engine for personal finance. Be completely RAW, direct, candid, and blunt. Do NOT sugarcoat or butter up anything. Say what is strictly correct, real, and factual. Look at the user's current loans and investments:
${JSON.stringify(payload)}

Your goal is to identify concrete, actionable opportunities. For example:
- If they have a high-interest credit card loan (>15%), suggest a balance transfer or taking a personal loan to consolidate it.
- If they have low-yield investments (like idle cash or basic savings) but high-interest loans, suggest paying off the loan.
- Suggest tax-saving investment strategies or portfolio rebalancing if applicable.

Return 0 to 2 highly actionable recommendations. For each, return a JSON object exactly matching this structure (no markdown):
[
  {
    "category": "DEBT", // Or "INVESTMENT", "TAX", "SAVINGS"
    "title": "Consolidate Credit Card Debt",
    "description": "Your credit card loan has a 24% interest rate. Consider a personal loan at ~12% to consolidate this debt.",
    "impactAmount": 1500, // Estimated savings in the currency
    "reasoning": "A 12% difference on 10,000 saves you roughly 1,200 per year."
  }
]
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (!response.text) {
        throw new Error("AI returned empty response");
      }

      const recommendations: any[] = JSON.parse(response.text);

      const createdRecommendations = await Promise.all(
        recommendations.map(async (rec) => {
          // Deduplicate active recommendations
          const existing = await prisma.aiCfoRecommendation.findFirst({
            where: {
              userId,
              title: rec.title,
              status: { in: ['PENDING', 'POSTPONED'] },
            },
          });

          if (!existing) {
            return prisma.aiCfoRecommendation.create({
              data: {
                userId,
                category: rec.category,
                title: rec.title,
                description: rec.description,
                impactAmount: rec.impactAmount,
                reasoning: rec.reasoning,
                dataSources: { source: "Opportunity Engine" },
              },
            });
          }
          return null;
        })
      );

      return {
        message: "Opportunity analysis complete",
        newRecommendationsCount: createdRecommendations.filter(r => r !== null).length,
      };
    } catch (error: any) {
      logger.error('Error analyzing opportunities', { userId, message: error.message });
      throw new Error('Failed to analyze financial opportunities');
    }
  }
}

export const opportunityService = new OpportunityService();
