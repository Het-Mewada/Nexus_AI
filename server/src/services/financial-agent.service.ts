import { prisma } from '../config/database';
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class FinancialAgentService {
  /**
   * Get the full financial context for a user (reused from ai.service).
   */
  private async getFinancialContext(userId: string) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const currency = user?.currency || 'INR';

    // Current month data
    const [incomes, expenses] = await Promise.all([
      prisma.income.findMany({ where: { userId, deletedAt: null, date: { gte: firstDayOfMonth } } }),
      prisma.expense.findMany({ where: { userId, deletedAt: null, date: { gte: firstDayOfMonth } }, include: { category: true } }),
    ]);

    const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
    const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      const name = e.category.name;
      categoryTotals[name] = (categoryTotals[name] || 0) + Number(e.amount);
    });

    // Last month data for comparison
    const lastMonthExpenses = await prisma.expense.findMany({
      where: { userId, deletedAt: null, date: { gte: lastMonth, lte: endOfLastMonth } },
      include: { category: true },
    });
    const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const lastMonthCategories: Record<string, number> = {};
    lastMonthExpenses.forEach((e) => {
      const name = e.category.name;
      lastMonthCategories[name] = (lastMonthCategories[name] || 0) + Number(e.amount);
    });

    // Budgets
    const budgets = await prisma.budget.findMany({ where: { userId }, include: { category: true } });
    const budgetData = budgets.map((b) => {
      const limit = Number(b.amount);
      const spent = b.category?.name ? (categoryTotals[b.category.name] || 0) : totalSpent;
      const utilization = limit > 0 ? (spent / limit) * 100 : 0;
      return {
        category: b.category?.name || 'Overall',
        limit,
        spent,
        utilization,
      };
    });

    // Goals
    const goals = await prisma.goal.findMany({ where: { userId, deletedAt: null } });
    const goalData = goals.map((g) => ({
      name: g.name,
      target: Number(g.targetAmount),
      current: Number(g.currentAmount),
      pct: Number(g.targetAmount) > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0,
      deadline: g.deadline?.toISOString().split('T')[0] || null,
    }));

    // Bills
    const bills = await prisma.bill.findMany({ where: { userId, deletedAt: null } });
    const unpaidBills = bills.filter((b) => !b.isPaid);

    // Subscriptions
    const subscriptions = await prisma.subscription.findMany({ where: { userId, status: 'ACTIVE' } });
    const monthlySubCost = subscriptions.reduce((s, sub) => {
      const amount = Number(sub.amount);
      return s + (sub.billingCycle === 'YEARLY' ? amount / 12 : amount);
    }, 0);

    // Investments
    const investments = await prisma.investment.findMany({ where: { userId } });
    let totalInvestments = 0;
    const invData = investments.map((inv) => {
      const currentVal = inv.currentPrice && inv.quantity
        ? Number(inv.currentPrice) * Number(inv.quantity)
        : Number(inv.investedAmount);
      totalInvestments += currentVal;
      return { name: inv.name, type: inv.type, value: currentVal, invested: Number(inv.investedAmount) };
    });

    // Loans
    const loans = await prisma.loan.findMany({ where: { userId } });
    const totalDebt = loans.reduce((s, l) => s + Number(l.outstandingAmount), 0);
    const monthlyEMI = loans.reduce((s, l) => s + Number(l.emiAmount || 0), 0);

    // Insurance
    const insurances = await prisma.insurance.findMany({ where: { userId } });

    // Smart Savings
    const smartSavings = await prisma.smartSaving.findMany({ where: { userId } });
    const totalSmartSaved = smartSavings.reduce((s, ss) => s + Number(ss.moneySaved), 0);

    // Detailed Complete Transaction History
    const allExpenses = await prisma.expense.findMany({
      where: { userId, deletedAt: null },
      include: { category: true },
      orderBy: { date: 'desc' },
    });
    const allIncomes = await prisma.income.findMany({
      where: { userId, deletedAt: null },
      orderBy: { date: 'desc' },
    });

    const transactionHistory = {
      expenses: allExpenses.map(e => ({
        date: e.date.toISOString().split("T")[0],
        merchant: e.merchant,
        amount: Number(e.amount),
        category: e.category.name,
        paymentMethod: e.paymentMethod,
        notes: e.notes || undefined,
        tags: e.tags?.length ? e.tags : undefined,
        isRecurring: e.isRecurring
      })),
      incomes: allIncomes.map(i => ({
        date: i.date.toISOString().split("T")[0],
        source: i.source,
        amount: Number(i.amount),
        notes: i.notes || undefined,
        isRecurring: i.isRecurring
      }))
    };

    const netWorth = totalInvestments - totalDebt;
    const monthlySalary = user?.monthlySalary ? Number(user.monthlySalary) : 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;

    return {
      userName: user?.name || 'User',
      currency,
      month: today.toLocaleString('default', { month: 'long' }),
      year: today.getFullYear(),
      monthlySalary,
      totalIncome,
      totalSpent,
      savingsRate,
      totalSmartSaved,
      cashFlow: totalIncome - totalSpent,
      categoryTotals,
      lastMonthTotal,
      lastMonthCategories,
      netWorth,
      budgets: budgetData,
      goals: goalData,
      unpaidBills: unpaidBills.map((b) => ({ name: b.name, amount: Number(b.amount), dueDate: b.dueDate.toISOString().split('T')[0] })),
      subscriptions: subscriptions.map((s) => ({ name: s.name, amount: Number(s.amount), cycle: s.billingCycle })),
      monthlySubCost,
      investments: { total: totalInvestments, breakdown: invData },
      loans: { total: totalDebt, monthlyEMI, count: loans.length },
      insurance: insurances.map((i) => ({ provider: i.provider, type: i.type, premium: Number(i.premiumAmount), cover: Number(i.coverageAmount) })),
      transactionHistory,
    };
  }

  /**
   * Run the autonomous financial agent for a specific user.
   * Generates proactive, data-driven insights and stores them.
   */
  async runAgentAnalysis(userId: string): Promise<void> {
    try {
      const context = await this.getFinancialContext(userId);

      const prompt = `You are an autonomous AI Financial Agent analyzing a user's complete financial ecosystem.
Your job is to find problems, risks, and opportunities that the user may not be aware of.
CRITICAL DIRECTIVE: Be completely RAW, direct, candid, and blunt. Do NOT sugarcoat or butter up anything. Say what is strictly correct, real, and factual.

USER'S FINANCIAL DATA (${context.month} ${context.year}):
- Monthly Salary: ${context.monthlySalary} ${context.currency}
- Income (MTD): ${context.totalIncome} ${context.currency}
- Spent (MTD): ${context.totalSpent} ${context.currency}
- Savings Rate: ${context.savingsRate.toFixed(1)}%
- Net Worth: ${context.netWorth} ${context.currency}
- Category Spending: ${JSON.stringify(context.categoryTotals)}
- Last Month Total Spend: ${context.lastMonthTotal} ${context.currency}
- Budget Status: ${JSON.stringify(context.budgets)}
- Goals: ${JSON.stringify(context.goals)}
- Unpaid Bills: ${JSON.stringify(context.unpaidBills)}
- Active Subscriptions (Monthly Cost: ${context.monthlySubCost}): ${JSON.stringify(context.subscriptions)}
- Smart Savings (Money intentionally not spent): ${context.currency}${context.totalSmartSaved}
- Portfolio (Total: ${context.investments.total}): ${JSON.stringify(context.investments.breakdown)}
- Debt (Total: ${context.loans.total}, Monthly EMI: ${context.loans.monthlyEMI}): ${context.loans.count} loans
- Insurance: ${JSON.stringify(context.insurance)}
- Detailed Transaction History (All Time): ${JSON.stringify(context.transactionHistory)}

ANALYSIS CATEGORIES — generate insights for ALL that apply:
1. ANOMALY: Unusual spending spikes vs last month (category jumped >50%)
2. BUDGET_WARNING: Any budget >80% utilized
3. CASH_FORECAST: Predict if user will run out of discretionary income this month
4. SUBSCRIPTION_WASTE: Subscriptions that seem redundant or expensive relative to income
5. PORTFOLIO_REBALANCE: Over-concentration in one asset type
6. SAVINGS_TIP: If savings rate <20%, suggest improvements
7. LOAN_PREPAY: If user has surplus cash, suggest loan prepayment benefits
8. EMERGENCY_FUND: If no emergency fund goal or it's <3 months expenses

For EACH insight, respond in this exact JSON format:
[
  {
    "type": "ANOMALY",
    "severity": "WARNING",
    "title": "Short title",
    "message": "Detailed explanation with specific numbers from the data",
    "data": { "category": "...", "currentSpend": 0, "lastMonthSpend": 0 }
  }
]

CRITICAL RULES:
- Only generate insights backed by the data above. No hallucinated data.
- Use the user's currency symbol (${context.currency}).
- If NO issues are found for a category, skip it. Do NOT force insights.
- Return an empty array [] if the user's finances look healthy.
- Return VALID JSON only.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (!response.text) return;

      let insights: any[];
      try {
        insights = JSON.parse(response.text);
      } catch {
        logger.warn('Agent returned invalid JSON', { userId, raw: response.text?.slice(0, 200) });
        return;
      }

      if (!Array.isArray(insights) || insights.length === 0) return;

      // Expire old unread insights of the same types
      const types = insights.map((i) => i.type);
      await prisma.aiInsight.updateMany({
        where: { userId, type: { in: types }, isRead: false, isDismissed: false },
        data: { isDismissed: true },
      });

      // Store new insights
      await prisma.aiInsight.createMany({
        data: insights.map((insight) => ({
          userId,
          type: insight.type || 'SAVINGS_TIP',
          severity: insight.severity || 'INFO',
          title: insight.title || 'Financial Insight',
          message: insight.message || '',
          data: insight.data || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        })),
      });

      logger.info(`Agent generated ${insights.length} insights for user ${userId}`);
    } catch (error: any) {
      logger.error('Financial agent analysis failed', { userId, message: error.message });
    }
  }

  /**
   * Get all active insights for a user.
   */
  async getInsights(userId: string) {
    return prisma.aiInsight.findMany({
      where: {
        userId,
        isDismissed: false,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Mark an insight as read.
   */
  async markInsightRead(userId: string, insightId: string) {
    return prisma.aiInsight.updateMany({
      where: { id: insightId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Dismiss an insight.
   */
  async dismissInsight(userId: string, insightId: string) {
    return prisma.aiInsight.updateMany({
      where: { id: insightId, userId },
      data: { isDismissed: true },
    });
  }

  /**
   * Run agent for ALL active users (called by scheduler).
   */
  async runForAllUsers(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    logger.info(`Running financial agent for ${users.length} users...`);

    const { aiCfoQueue } = await import('../config/queue');
    for (const user of users) {
      await aiCfoQueue.add('runUserFinancialAgent', { userId: user.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    }

    logger.info('Financial agent tasks enqueued.');
  }

  /**
   * Public accessor for financial context (used by conversation service).
   */
  async getUserFinancialContext(userId: string) {
    return this.getFinancialContext(userId);
  }
}

export const financialAgentService = new FinancialAgentService();
