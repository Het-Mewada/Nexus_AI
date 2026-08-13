import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class AIService {
  public async getUserFinancialContext(userId: string) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const currency = user?.currency || "USD";

    // Incomes
    const incomes = await prisma.income.findMany({
      where: { userId, deletedAt: null, date: { gte: firstDayOfMonth } },
    });
    const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

    // Expenses
    const expenses = await prisma.expense.findMany({
      where: { userId, deletedAt: null, date: { gte: firstDayOfMonth } },
      include: { category: true },
    });
    const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Group expenses by category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((exp) => {
      const catName = exp.category.name;
      categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(exp.amount);
    });

    // Budgets
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true }
    });
    const budgetData = budgets.map(b => ({
      category: b.category?.name || "Overall",
      amount: Number(b.amount),
      period: b.period
    }));

    // Goals
    const goals = await prisma.goal.findMany({ where: { userId, deletedAt: null } });
    const goalData = goals.map(g => ({
      name: g.name,
      target: Number(g.targetAmount),
      current: Number(g.currentAmount),
      deadline: g.deadline ? g.deadline.toISOString().split("T")[0] : null
    }));

    // Bills
    const bills = await prisma.bill.findMany({ where: { userId, deletedAt: null } });
    const billData = bills.map(b => ({
      name: b.name,
      amount: Number(b.amount),
      dueDate: b.dueDate.toISOString().split("T")[0],
      isPaid: b.isPaid,
      isRecurring: b.isRecurring
    }));

    // Subscriptions
    const subscriptions = await prisma.subscription.findMany({ where: { userId, status: "ACTIVE" } });
    const subData = subscriptions.map(s => ({
      name: s.name,
      amount: Number(s.amount),
      cycle: s.billingCycle,
      nextPayment: s.nextPayment.toISOString().split("T")[0]
    }));

    // Investments
    const investments = await prisma.investment.findMany({ where: { userId } });
    let totalInvestments = 0;
    const invData = investments.map(inv => {
      const currentVal = (inv.currentPrice && inv.quantity)
        ? Number(inv.currentPrice) * Number(inv.quantity)
        : Number(inv.investedAmount);
      totalInvestments += currentVal;
      return { name: inv.name, type: inv.type, value: currentVal };
    });

    // Liabilities (Loans)
    const loans = await prisma.loan.findMany({ where: { userId } });
    const totalDebt = loans.reduce((sum, loan) => sum + Number(loan.outstandingAmount), 0);
    const monthlyEMI = loans.reduce((sum, loan) => sum + Number(loan.emiAmount || 0), 0);
    const loanData = loans.map(l => ({ name: l.name, outstanding: Number(l.outstandingAmount), emi: Number(l.emiAmount), rate: Number(l.interestRate) }));

    // Insurance
    const insurances = await prisma.insurance.findMany({ where: { userId } });
    const insData = insurances.map(i => ({ provider: i.provider, type: i.type, premium: Number(i.premiumAmount), cover: Number(i.coverageAmount) }));

    // Tax Profile
    const currentYear = today.getMonth() < 3 ? `${today.getFullYear() - 1}-${today.getFullYear()}` : `${today.getFullYear()}-${today.getFullYear() + 1}`;
    const taxProfile = await prisma.taxProfile.findUnique({ where: { userId_financialYear: { userId, financialYear: currentYear } } });
    const taxData = taxProfile ? {
      year: taxProfile.financialYear,
      estimatedIncome: Number(taxProfile.estimatedIncome),
      taxPaid: Number(taxProfile.taxPaid),
      estimatedTax: Number(taxProfile.estimatedTax)
    } : null;

    // Shared Wallets
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      include: { group: { include: { wallets: true } } }
    });
    const sharedWallets = groupMemberships.flatMap(m => m.group.wallets.map(w => ({ name: w.name, balance: Number(w.balance) })));

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

    return {
      currentDate: today.toISOString().split("T")[0],
      month: today.toLocaleString('default', { month: 'long' }),
      year: today.getFullYear(),
      totalIncome,
      totalSpent,
      categoryTotals,
      currency,
      netWorth,
      budgets: budgetData,
      goals: goalData,
      bills: billData,
      subscriptions: subData,
      investments: { total: totalInvestments, breakdown: invData },
      loans: { total: totalDebt, monthlyEMI, breakdown: loanData },
      insurance: insData,
      taxes: taxData,
      sharedWallets,
      transactionHistory
    };
  }

  async generateInsights(userId: string) {
    try {
      const context = await this.getUserFinancialContext(userId);
      const prompt = `
        You are a highly intelligent personal finance assistant.
        Today's Date is: ${context.currentDate}
        Analyze the following comprehensive financial data for the user for ${context.month} ${context.year}:
        
        Income: ${context.totalIncome} ${context.currency}
        Spent: ${context.totalSpent} ${context.currency}
        Category Breakdown: ${JSON.stringify(context.categoryTotals)}
        Net Worth: ${context.netWorth} ${context.currency}
        
        Budgets: ${JSON.stringify(context.budgets)}
        Goals: ${JSON.stringify(context.goals)}
        Upcoming/Unpaid Bills: ${JSON.stringify(context.bills.filter(b => !b.isPaid))}
        Active Subscriptions: ${JSON.stringify(context.subscriptions)}
        Investments: ${JSON.stringify(context.investments.breakdown)}
        Debts: ${JSON.stringify(context.loans.breakdown)} (Total EMI: ${context.loans.monthlyEMI})
        Insurance: ${JSON.stringify(context.insurance)}
        Tax Profile: ${JSON.stringify(context.taxes)}
        Shared Wallets: ${JSON.stringify(context.sharedWallets)}
        Detailed Transaction History (All Time): ${JSON.stringify(context.transactionHistory)}

        IMPORTANT: ALWAYS format monetary values using the user's currency: ${context.currency}.
        CRITICAL DIRECTIVE: Be completely RAW, direct, candid, and blunt. Do NOT sugarcoat, butter up, or use pleasantries. State what is factually true, correct, and real without softening the truth.

        Generate 3 concise, actionable, and hyper-personalized financial insights. 
        Focus on urgent matters first (e.g., bills due soon, exceeded budgets, low savings progress, tax optimization).
        Do not use markdown lists. Return a JSON array of strings.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      if (!response.text) return [];
      return JSON.parse(response.text) as string[];
    } catch (error: any) {
      logger.error("Error generating AI insights", { message: error.message, stack: error.stack });
      return ["Unable to generate insights at the moment. Please try again later."];
    }
  }

  async chatAdvisor(userId: string, query: string, retries = 2): Promise<{ role: string, content: string }> {
    try {
      const context = await this.getUserFinancialContext(userId);

      const prompt = `
        You are the Nexus AI Financial Advisor, an omniscient and expert personal finance assistant.
        
        User Query:
        <user_query>
        ${query.replace(/<\/user_query>/g, '')}
        </user_query>
        
        Today's Date is: ${context.currentDate}
        Here is the user's COMPLETE financial profile for ${context.month} ${context.year}:
        
        Income (MTD): ${context.totalIncome} ${context.currency}
        Spent (MTD): ${context.totalSpent} ${context.currency}
        Category Breakdown: ${JSON.stringify(context.categoryTotals)}
        Net Worth: ${context.netWorth} ${context.currency}
        
        Budgets: ${JSON.stringify(context.budgets)}
        Goals: ${JSON.stringify(context.goals)}
        Bills: ${JSON.stringify(context.bills)}
        Subscriptions: ${JSON.stringify(context.subscriptions)}
        Investments (Total: ${context.investments.total}): ${JSON.stringify(context.investments.breakdown)}
        Debts (Total: ${context.loans.total}, EMI: ${context.loans.monthlyEMI}): ${JSON.stringify(context.loans.breakdown)}
        Insurance Policies: ${JSON.stringify(context.insurance)}
        Tax Profile: ${JSON.stringify(context.taxes)}
        Family/Shared Wallets: ${JSON.stringify(context.sharedWallets)}
        Detailed Transaction History (All Time): ${JSON.stringify(context.transactionHistory)}
        
        CRITICAL DIRECTIVE: Be completely RAW, direct, candid, and blunt. Do NOT sugarcoat or butter up anything. Say what is strictly correct and factual without unnecessary pleasantries or fluff.
        You possess knowledge of EVERY aspect of their finances. If they ask about budgets, goals, bills, taxes, or family wallets, use the data above to give precise answers.
        You HAVE FULL ACCESS to their detailed transaction history (including specific merchants, personal notes, tags, dates, and amounts). If the user asks about specific notes or people, actively search the Detailed Transaction History data to answer. NEVER deny having access to this data.
        IMPORTANT: ALWAYS format monetary values using the user's currency (${context.currency}). Use the correct symbol (e.g., ₹ for INR, € for EUR, $ for USD).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return {
        role: "assistant",
        content: response.text || "I'm sorry, I couldn't process your request right now."
      };
    } catch (error: any) {
      if (retries > 0) {
        logger.warn(`AI Advisor error, retrying... (${retries} retries left). Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.chatAdvisor(userId, query, retries - 1);
      }
      logger.error("Error in AI Advisor Chat", { message: error.message, stack: error.stack, status: error.status });
      return {
        role: "assistant",
        content: "I'm currently experiencing high traffic and the AI service is temporarily overloaded. Please try again in a few moments."
      };
    }
  }

  async categorizeTransaction(merchant: string, description: string = "") {
    try {
      const prompt = `
        Given the following transaction details, determine the single most appropriate budget category.
        Merchant: ${merchant}
        Description/Notes: ${description}

        Respond ONLY with one of the following category names exactly: 
        Housing, Food, Transportation, Utilities, Insurance, Healthcare, Savings, Debt, Personal, Education, Entertainment, Shopping, Gifts, Other.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text?.trim() || "Other";
      return text;
    } catch (error) {
      logger.error("Error categorizing transaction", { error });
      return "Other";
    }
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return response.text || "";
    } catch (error) {
      logger.error("AI Generation Error", error);
      throw new Error("Failed to generate AI response");
    }
  }

  async scanReceipt(fileBuffer: Buffer, mimeType: string, categories: { id: string, name: string }[]) {
    try {
      const categoryNames = categories.map(c => c.name).join(", ");
      const prompt = `
        You are an expert AI Receipt Scanner.
        Extract the following information from this receipt image/document.
        Return ONLY a JSON object with the exact keys:
        - amount: The final payable amount (a number). Extract the final total, not the subtotal.
        - date: The transaction date in YYYY-MM-DD format. Do not use today's date unless the receipt explicitly indicates it.
        - merchant: The name of the merchant/store. If this is a person-to-person transfer (like Google Pay/UPI to an individual), use the recipient's name (e.g., "Bharati A Mevada") as the merchant.
        - category: Map to ONE of these categories exactly: ${categoryNames}. If it is a transfer to an individual/relative, strongly consider categorizing it as "Family", "Personal", or "Transfers". If you cannot confidently determine the category, return "Select".
        - paymentMethod: IMPORTANT: Look for logos, text, or IDs indicating the payment method. If it's Google Pay, GPay, PhonePe, Paytm, PayTM , or shows a "UPI transaction ID", return "upi". If it's a credit/debit card, return "card". If it's a bank transfer, return "netbanking". Use exactly these string values: "cash", "upi", "card", "netbanking". If completely unknown, return null.
        - tags: A short array of relevant string tags. If it's Google Pay, include "GPay". If it's UPI, include "UPI". Max 2-3 tags.
        - notes: A concise note. For person-to-person transfers, format it nicely, e.g., "Payment to [Name]". For merchants, a short note about the purchase. If nothing useful, return null.
        
        IMPORTANT: NEVER hallucinate information that is not on the receipt. If a field cannot be determined, return null (except category, which should be "Select").
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          prompt,
          {
            inlineData: {
              data: fileBuffer.toString("base64"),
              mimeType: mimeType,
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const extracted = JSON.parse(text);

      // Match the exact category ID based on the name Gemini returned
      let categoryId = "";
      if (extracted.category && extracted.category !== "Select") {
        const found = categories.find(c => c.name.toLowerCase() === extracted.category.toLowerCase());
        if (found) categoryId = found.id;
      }
      extracted.categoryId = categoryId;

      return extracted;
    } catch (error) {
      logger.error("Error scanning receipt", { error });
      throw new Error("Failed to scan receipt");
    }
  }
}

export const aiService = new AIService();
