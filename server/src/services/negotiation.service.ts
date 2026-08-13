import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class NegotiationService {
  /**
   * Initializes a new negotiation session with a specific template.
   */
  async startNegotiation(userId: string, topic: string) {
    let systemPrompt = "";
    let initialMessage = "";

    switch (topic.toUpperCase()) {
      case "RENT":
        systemPrompt = "You are an AI Negotiation Assistant specializing in real estate and rent negotiations. Be completely RAW, direct, candid, and blunt. Do NOT sugarcoat or butter up. Provide realistic, direct, and un-sugarcoated templates and advice.";
        initialMessage = "I'm your Rent Negotiation Assistant. To get started, what is your current rent, what is the proposed new rent, and do you have any leverage (e.g., you've been a great tenant, market rates are lower)?";
        break;
      case "SALARY":
        systemPrompt = "You are an AI Negotiation Assistant specializing in career and salary negotiations. Be completely RAW, direct, candid, and blunt. Do NOT sugarcoat or butter up. Help the user build a solid case based strictly on facts, market data, and value delivered.";
        initialMessage = "I'm your Salary Negotiation Assistant. Tell me about your current role, your current salary, and the target salary you are aiming for. What are your key achievements in the last year?";
        break;
      case "BILLS":
        systemPrompt = "You are an AI Negotiation Assistant specializing in negotiating bills (internet, phone, utilities, medical). Be completely RAW, direct, candid, and blunt. Do NOT sugarcoat or butter up.";
        initialMessage = "I'm your Bill Negotiation Assistant. Which bill are we trying to lower today? (e.g., Internet, Phone, Medical)";
        break;
      default:
        systemPrompt = "You are an AI Negotiation Assistant. Be completely RAW, direct, candid, and blunt. Do NOT sugarcoat or butter up. Give direct, factual negotiation strategies.";
        initialMessage = "I'm your Negotiation Assistant. What are we trying to negotiate today?";
        break;
    }

    const conversation = await prisma.aiConversation.create({
      data: {
        userId,
        title: `${topic} Negotiation`,
        messages: {
          create: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "assistant",
              content: initialMessage,
            }
          ]
        }
      },
      include: { messages: true }
    });

    return conversation;
  }
}

export const negotiationService = new NegotiationService();
