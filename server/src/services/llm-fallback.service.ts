import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model' | 'system';
  content: string;
}

export interface LLMGenerateOptions {
  systemPrompt?: string;
  messages?: ChatMessage[];
  userMessage: string;
  financialContext?: any;
}

export class LLMFallbackService {
  private geminiAi: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== "") {
      try {
        this.geminiAi = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      } catch (err: any) {
        logger.warn("Failed to initialize GoogleGenAI client:", { message: err.message });
      }
    }
  }

  /**
   * Generates a response using multi-provider fallback.
   * Order: Gemini -> OpenAI -> Groq/OpenRouter -> Free API -> Local Financial Intelligence Engine
   */
  public async generateResponse(options: LLMGenerateOptions): Promise<string> {
    const { systemPrompt = "", messages = [], userMessage, financialContext } = options;

    // 1. Try Google Gemini
    if (this.geminiAi) {
      try {
        logger.info("Attempting AI generation with Tier 1 (Google Gemini)");
        const result = await this.callGemini(systemPrompt, messages, userMessage);
        if (result && result.trim()) {
          return result;
        }
      } catch (error: any) {
        logger.warn("Tier 1 (Google Gemini) failed:", { message: error.message });
      }
    } else {
      logger.info("Tier 1 (Google Gemini) skipped: GEMINI_API_KEY not configured");
    }

    // 2. Try OpenAI GPT
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim() !== "") {
      try {
        logger.info("Attempting AI generation with Tier 2 (OpenAI GPT)");
        const result = await this.callOpenAI(systemPrompt, messages, userMessage);
        if (result && result.trim()) {
          return result;
        }
      } catch (error: any) {
        logger.warn("Tier 2 (OpenAI GPT) failed:", { message: error.message });
      }
    }

    // 3. Try Groq or OpenRouter
    if ((env.GROQ_API_KEY && env.GROQ_API_KEY.trim() !== "") || (env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.trim() !== "")) {
      try {
        logger.info("Attempting AI generation with Tier 3 (Groq / OpenRouter)");
        const result = await this.callOpenAICompatible(systemPrompt, messages, userMessage);
        if (result && result.trim()) {
          return result;
        }
      } catch (error: any) {
        logger.warn("Tier 3 (Groq / OpenRouter) failed:", { message: error.message });
      }
    }

    // 4. Try Free Public AI API (Pollinations AI)
    try {
      logger.info("Attempting AI generation with Tier 4 (Free Public AI API)");
      const result = await this.callFreePublicAPI(systemPrompt, messages, userMessage);
      if (result && result.trim()) {
        return result;
      }
    } catch (error: any) {
      logger.warn("Tier 4 (Free Public AI API) failed:", { message: error.message });
    }

    // 5. Guaranteed Fallback: Local Financial Intelligence Engine
    logger.info("Using Tier 5 (Local Financial Intelligence Engine Fallback)");
    return this.generateLocalFinancialIntelligence(userMessage, financialContext);
  }

  /**
   * Tier 1: Call Google Gemini API
   */
  private async callGemini(systemPrompt: string, messages: ChatMessage[], userMessage: string): Promise<string> {
    if (!this.geminiAi) throw new Error("Gemini AI client not initialized");

    const validMessages = messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant' || m.role === 'model'
    );

    const history = validMessages.map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }],
    }));

    const rawContents = [
      { role: 'user' as const, parts: [{ text: systemPrompt }] },
      { role: 'model' as const, parts: [{ text: 'Understood. How can I help you today?' }] },
      ...history,
      { role: 'user' as const, parts: [{ text: userMessage }] },
    ];

    // Collapse consecutive roles to satisfy Gemini's strict alternation requirement
    const collapsedContents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const msg of rawContents) {
      if (collapsedContents.length > 0 && collapsedContents[collapsedContents.length - 1].role === msg.role) {
        collapsedContents[collapsedContents.length - 1].parts[0].text += `\n\n${msg.parts[0].text}`;
      } else {
        collapsedContents.push(msg);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await this.geminiAi.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: collapsedContents,
      });

      return response.text || "";
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Tier 2: Call OpenAI GPT API
   */
  private async callOpenAI(systemPrompt: string, messages: ChatMessage[], userMessage: string): Promise<string> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: formattedMessages,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`OpenAI API returned status ${res.status}`);
      }

      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || "";
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Tier 3: Call Groq or OpenRouter API
   */
  private async callOpenAICompatible(systemPrompt: string, messages: ChatMessage[], userMessage: string): Promise<string> {
    const isGroq = !!(env.GROQ_API_KEY && env.GROQ_API_KEY.trim() !== "");
    const endpoint = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

    const apiKey = isGroq ? env.GROQ_API_KEY : env.OPENROUTER_API_KEY;
    const model = isGroq ? "llama-3.3-70b-versatile" : "meta-llama/llama-3.3-70b-instruct";

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`API returned status ${res.status}`);
      }

      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || "";
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Tier 4: Call Free Public AI API (Pollinations AI)
   */
  private async callFreePublicAPI(systemPrompt: string, messages: ChatMessage[], userMessage: string): Promise<string> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-5).map((m) => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: formattedMessages,
          model: "openai",
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Pollinations API returned status ${res.status}`);
      }

      const text = await res.text();
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Tier 5: Local Financial Intelligence Engine (100% Offline Rule Engine)
   */
  private generateLocalFinancialIntelligence(userMessage: string, financialContext?: any): string {
    const lowerPrompt = userMessage.toLowerCase();
    const name = financialContext?.userName || "there";
    const currency = financialContext?.currency || "INR";
    const symbol = currency === "INR" ? "₹" : "$";

    const totalIncome = Number(financialContext?.income || financialContext?.totalIncome || 0);
    const totalSpent = Number(financialContext?.totalSpent || financialContext?.totalExpenses || 0);
    const netSavings = totalIncome - totalSpent;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const topCategories = financialContext?.categoryTotals || financialContext?.topCategories || {};

    // Analyze intent
    const isGreeting = /^(hi|hello|hey|greetings|good morning|good evening)/i.test(userMessage.trim());
    const isTipsOrReduce = lowerPrompt.includes("tip") || lowerPrompt.includes("reduce") || lowerPrompt.includes("cut") || lowerPrompt.includes("spend") || lowerPrompt.includes("expense");
    const isBudget = lowerPrompt.includes("budget") || lowerPrompt.includes("saving") || lowerPrompt.includes("save");
    const isDebt = lowerPrompt.includes("debt") || lowerPrompt.includes("loan") || lowerPrompt.includes("emi");

    if (isGreeting && !isTipsOrReduce && !isBudget) {
      return `Hello ${name}! 👋 I'm your Nexus AI Financial Advisor. How can I help you manage your budget, track expenses, or reach your financial goals today?`;
    }

    let response = `Here is a personalized financial analysis based on your current spending behavior, ${name}:\n\n`;

    // High level metrics
    if (totalIncome > 0 || totalSpent > 0) {
      response += `📊 **Financial Overview**:\n`;
      if (totalIncome > 0) response += `- **Monthly Income**: ${symbol}${totalIncome.toLocaleString()}\n`;
      if (totalSpent > 0) response += `- **Total Expenses**: ${symbol}${totalSpent.toLocaleString()}\n`;
      if (totalIncome > 0) response += `- **Estimated Savings Rate**: ${savingsRate}%\n\n`;
    }

    // Top Category Spending Breakdown
    const catEntries = Object.entries(topCategories);
    if (catEntries.length > 0) {
      response += `💳 **Top Expense Categories**:\n`;
      const sorted = catEntries.sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 4);
      sorted.forEach(([cat, amt]) => {
        response += `- **${cat}**: ${symbol}${Number(amt).toLocaleString()}\n`;
      });
      response += `\n`;
    }

    // Specific actionable tips
    response += `💡 **Actionable Tips to Reduce Expenses & Optimize Spending**:\n`;
    response += `1. **Target Highest Outflow Category**: Focus on your top spending category. Reducing it by just 10-15% could immediately boost your monthly savings.\n`;
    response += `2. **Review Recurring Subscriptions**: Audit active subscriptions or bills for unused services or options to downgrade to annual plans.\n`;
    response += `3. **Apply the 50/30/20 Rule**: Allocate 50% of income to Needs, 30% to Wants, and 20% to Savings/Investments.\n`;
    response += `4. **Set Category-Specific Budgets**: Create strict spending limits on flexible categories like Dining Out, Entertainment, or Shopping in the Budgets section.\n`;

    return response;
  }
}

export const llmFallbackService = new LLMFallbackService();
