import { PrismaClient, SmartSaving, Achievement } from '@prisma/client';
import { aiService } from './ai.service';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class SmartSavingsService {
  /**
   * Add a new Smart Saving entry
   */
  async addSmartSaving(userId: string, data: any) {
    const {
      actualPurchaseWanted,
      expectedCost,
      actualPurchase,
      actualCost,
      categoryId,
      decisionReason,
      description,
      mood,
      difficulty,
      wouldBuyLater,
      photoUrl,
    } = data;

    // Calculate money saved
    const moneySaved = Number(expectedCost) - Number(actualCost);
    if (moneySaved < 0) {
      throw new Error('Actual cost cannot be greater than expected cost for a smart saving.');
    }

    const saving = await prisma.smartSaving.create({
      data: {
        userId,
        categoryId,
        actualPurchaseWanted,
        expectedCost,
        actualPurchase,
        actualCost,
        moneySaved,
        decisionReason,
        description,
        mood,
        difficulty,
        wouldBuyLater,
        photoUrl,
      },
      include: {
        category: true,
      }
    });

    // Check for achievements asynchronously
    this.checkAndUnlockAchievements(userId).catch(console.error);

    return saving;
  }

  /**
   * Get all smart savings for a user
   */
  async getSmartSavings(userId: string, filters: any = {}) {
    const where: any = { userId };
    
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.decisionReason) where.decisionReason = filters.decisionReason;
    if (filters.mood) where.mood = filters.mood;
    
    return prisma.smartSaving.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { category: true }
    });
  }

  /**
   * Get dashboard analytics and projections
   */
  async getAnalytics(userId: string) {
    const savings = await prisma.smartSaving.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    if (savings.length === 0) {
      return this.getEmptyAnalytics();
    }

    const totalSaved = savings.reduce((acc, curr) => acc + Number(curr.moneySaved), 0);
    const averagePerDecision = totalSaved / savings.length;
    
    // Calculate streak (days in a row making a smart saving)
    // Basic streak logic
    let currentStreak = 0;
    let longestStreak = 0;
    let lastDate: Date | null = null;
    
    // Create unique days set
    const uniqueDays = new Set(
      savings.map(s => s.createdAt.toISOString().split('T')[0])
    );
    const sortedDays = Array.from(uniqueDays).sort();
    
    let tempStreak = 0;
    let previousDay: Date | null = null;
    
    for (const dayStr of sortedDays) {
      const currentDay = new Date(dayStr);
      if (!previousDay) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(currentDay.getTime() - previousDay.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 1) {
          tempStreak += 1;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      previousDay = currentDay;
    }
    
    // Check if current streak is active (today or yesterday)
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (sortedDays.includes(todayStr) || sortedDays.includes(yesterdayStr)) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0;
    }

    // Averages and Projections
    // Estimate average daily savings based on first saving date
    const firstSavingDate = savings[0].createdAt;
    const daysSinceFirst = Math.max(1, Math.ceil((new Date().getTime() - firstSavingDate.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyAverage = totalSaved / daysSinceFirst;
    const monthlyAverage = totalSaved / Math.max(1, Math.ceil(daysSinceFirst / 30));
    const yearlyAverage = monthlyAverage * 12;

    // Investment Growth Projections (assuming 8% annual return, compounded monthly)
    const rate = 0.08 / 12; // Monthly rate
    const calculateFV = (months: number, pmt: number) => {
      if (rate === 0) return pmt * months;
      return pmt * ((Math.pow(1 + rate, months) - 1) / rate);
    };

    return {
      overview: {
        totalSaved,
        totalDecisions: savings.length,
        averagePerDecision,
        currentStreak,
        longestStreak,
      },
      projections: {
        dailyAverage,
        monthlyAverage,
        yearlyAverage,
        projected1Year: calculateFV(12, monthlyAverage),
        projected5Year: calculateFV(60, monthlyAverage),
        projected10Year: calculateFV(120, monthlyAverage),
      },
      recentSavings: savings.slice(-5).reverse(),
    };
  }

  /**
   * Get personalized AI Insights regarding Smart Savings
   */
  async generateAiInsights(userId: string) {
    const analytics = await this.getAnalytics(userId);
    if (analytics.overview.totalDecisions === 0) {
      return [
        "Welcome to Smart Savings! Start logging decisions where you intentionally resisted spending money to receive personalized behavioral insights."
      ];
    }

    const savings = await prisma.smartSaving.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20, // Send last 20 for behavioral analysis
      include: { category: true }
    });

    const prompt = `
      You are an expert behavioral financial psychologist.
      Analyze the user's recent "Smart Savings" decisions (instances where they intentionally resisted spending).
      
      Overview:
      Total Saved: ₹${analytics.overview.totalSaved} across ${analytics.overview.totalDecisions} decisions.
      Monthly Average Avoided: ₹${analytics.projections.monthlyAverage.toFixed(0)}
      5-Year Investment Projection (8%): ₹${analytics.projections.projected5Year.toFixed(0)}
      
      Recent Data:
      ${JSON.stringify(savings.map(s => ({
        wanted: s.actualPurchaseWanted,
        actual: s.actualPurchase,
        saved: s.moneySaved,
        reason: s.decisionReason,
        mood: s.mood,
        difficulty: s.difficulty,
        category: s.category.name
      })))}
      
      Generate 3 highly personalized, encouraging, and highly specific insights (e.g. "You resist food temptations well", "You tend to save most when your mood is X", "Your habit of skipping cafes will save you X over 5 years").
      Format as a JSON array of 3 string sentences.
    `;

    try {
      const response = await aiService.generateText(prompt);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      return [
        `You have saved ₹${analytics.overview.totalSaved} through sheer discipline!`,
        `If you continue this habit, you could amass ₹${analytics.projections.projected5Year.toFixed(0)} in 5 years (invested at 8%).`,
        "Keep tracking your financial wins!"
      ];
    }
  }

  /**
   * Get achievements
   */
  async getAchievements(userId: string) {
    // List of all possible badges for the frontend
    const allBadges = [
      { code: 'FIRST_STEP', name: 'First Smart Saving', description: 'Made your first smart financial decision.', icon: 'star' },
      { code: 'SAVED_1K', name: '₹1,000 Saved', description: 'Saved your first ₹1,000 through discipline.', icon: 'award' },
      { code: 'SAVED_10K', name: '₹10,000 Saved', description: 'Saved ₹10,000 through intentional choices.', icon: 'shield' },
      { code: 'STREAK_7', name: '7-Day Streak', description: 'Made smart decisions 7 days in a row.', icon: 'zap' },
      { code: 'IMPULSE_MASTER', name: 'Impulse Master', description: 'Resisted 10 impulse purchases.', icon: 'brain' },
    ];

    const unlocked = await prisma.achievement.findMany({
      where: { userId, type: 'SMART_SAVING' }
    });
    
    return {
      unlocked,
      allBadges
    };
  }

  /**
   * Internal method to check and unlock achievements based on total progress
   */
  private async checkAndUnlockAchievements(userId: string) {
    const analytics = await this.getAnalytics(userId);
    const existing = await prisma.achievement.findMany({
      where: { userId, type: 'SMART_SAVING' }
    });
    const unlockedCodes = new Set(existing.map(e => e.code));
    
    const unlock = async (code: string, name: string, description: string) => {
      if (!unlockedCodes.has(code)) {
        await prisma.achievement.create({
          data: { userId, type: 'SMART_SAVING', code, name, description }
        });
      }
    };

    if (analytics.overview.totalDecisions >= 1) {
      await unlock('FIRST_STEP', 'First Smart Saving', 'Made your first smart financial decision.');
    }
    if (analytics.overview.totalSaved >= 1000) {
      await unlock('SAVED_1K', '₹1,000 Saved', 'Saved your first ₹1,000 through discipline.');
    }
    if (analytics.overview.totalSaved >= 10000) {
      await unlock('SAVED_10K', '₹10,000 Saved', 'Saved ₹10,000 through intentional choices.');
    }
    if (analytics.overview.longestStreak >= 7) {
      await unlock('STREAK_7', '7-Day Streak', 'Made smart decisions 7 days in a row.');
    }
    
    // Check impulse purchases
    const impulseCount = await prisma.smartSaving.count({
      where: { userId, decisionReason: 'Impulse Control' }
    });
    if (impulseCount >= 10) {
      await unlock('IMPULSE_MASTER', 'Impulse Master', 'Resisted 10 impulse purchases.');
    }
  }

  private getEmptyAnalytics() {
    return {
      overview: {
        totalSaved: 0,
        totalDecisions: 0,
        averagePerDecision: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
      projections: {
        dailyAverage: 0,
        monthlyAverage: 0,
        yearlyAverage: 0,
        projected1Year: 0,
        projected5Year: 0,
        projected10Year: 0,
      },
      recentSavings: [],
    };
  }
}

export const smartSavingsService = new SmartSavingsService();
