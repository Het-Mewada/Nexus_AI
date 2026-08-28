import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { getLocalDateString } from "../utils/date-utils";


const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export interface FieldExtraction<T = any> {
  value: T | null;
  confidence: number; // 0.0 to 1.0 (or 0 to 100)
  source: "explicit" | "inferred" | "missing" | "explicit_relative" | "explicit_date" | "context";
  raw?: string | null;
}

export interface ExtractedVoiceExpense {
  fields: {
    amount: FieldExtraction<number>;
    currency: FieldExtraction<string>;
    category: FieldExtraction<string>; // category name
    categoryId?: FieldExtraction<string | null>; // matched category ID if available
    merchant: FieldExtraction<string>;
    description: FieldExtraction<string>;
    date: FieldExtraction<string>; // YYYY-MM-DD
    payment_method: FieldExtraction<"cash" | "debit_card" | "upi" | "other">;
    notes: FieldExtraction<string>;
  };
  overall_confidence: number; // 0.0 to 1.0
  raw_transcript: string;
  explanation?: string | null;
}

export interface UserCategoryInfo {
  id: string;
  name: string;
}

export class VoiceExpenseService {
  /**
   * Parses natural spoken or typed text into structured expense data with confidence scoring.
   */
  async parseVoiceExpense(
    transcript: string,
    categories: UserCategoryInfo[],
    userCurrency: string = "INR",
    userTimezone: string = "Asia/Kolkata",
    referenceDateStr?: string
  ): Promise<ExtractedVoiceExpense> {
    const cleanedTranscript = transcript.trim();
    if (!cleanedTranscript) {
      return this.createEmptyResponse(transcript, userCurrency);
    }

    // Determine current date in user's timezone
    const now = referenceDateStr ? new Date(referenceDateStr) : new Date();
    const currentDate = getLocalDateString(now, userTimezone);
    const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: userTimezone }).format(now);

    const categoryListStr = categories.map((c) => c.name).join(", ");

    const prompt = `
You are an expert AI Voice Assistant for personal finance.
Your task is to parse a spoken or typed natural language expense utterance into structured JSON with field-level confidence scores.

User Utterance: "${cleanedTranscript.replace(/"/g, '\\"')}"
Current Date (Today): ${currentDate} (${dayOfWeek})
User Primary Currency: ${userCurrency}
User Timezone: ${userTimezone}
Available Categories in User's App: [${categoryListStr}]
Available Payment Methods in App: ["cash", "debit_card", "upi", "other"]

CRITICAL STRICT RULES:
1. DO NOT SILENTLY GUESS values that are not explicitly stated or strongly implied by context.
2. If amount is missing or cannot be inferred with certainty (e.g. "I spent some money yesterday" or "Paid for dinner"), set amount.value = null, confidence = 0, source = "missing".
3. For amounts, normalize natural monetary expressions:
   - "₹500", "500 rupees", "500 INR", "five hundred" -> 500
   - "1.5k", "1.5 K" -> 1500
   - "2k" -> 2000
   - "twelve hundred" -> 1200
   - "1,250" -> 1250
4. For relative dates, compute the exact YYYY-MM-DD relative to Today (${currentDate}):
   - "today", "this morning", "tonight", "just now" -> ${currentDate}
   - "yesterday", "last night", "yesterday evening" -> 1 day before ${currentDate}
   - "2 days ago" -> 2 days before ${currentDate}
   - "last Monday", "last Friday" -> the most recent preceding Monday / Friday
5. Distinguish between Merchant (store/vendor name e.g., Starbucks, D-Mart, Swiggy, Uber, Amazon) and Description/Notes (item details e.g., coffee, groceries, dinner with friends, fuel).
6. Map payment methods to EXACTLY one of: "cash", "debit_card", "upi", "other".
   - "UPI", "GPay", "Google Pay", "PhonePe", "Paytm", "BHIM" -> "upi"
   - "credit card", "debit card", "HDFC card", "SBI card", "card" -> "debit_card"
   - "cash" -> "cash"
   - If not mentioned, set payment_method.value = null, confidence = 0, source = "missing".
7. Category mapping:
   - Match the purchase to the SINGLE most accurate category from [${categoryListStr}].
   - If dinner / lunch / food -> "Food" (or matching food category)
   - If Uber / fuel / petrol -> "Transportation" / "Fuel" (or matching transport category)
   - If Netflix / movies -> "Entertainment"
   - If D-Mart / shopping -> "Shopping" / "Groceries"
   - If no category is mentioned and none can be inferred with confidence >= 0.5, set category.value = null, confidence = 0, source = "missing".
8. Confidence Scores:
   - Confidence must be a float between 0.00 and 1.00 (e.g. 0.98 for 98%, 0.85 for 85%).
   - Explicit exact mentions get 0.90 to 1.00.
   - High-confidence inferences (e.g. "dinner" -> Food) get 0.85 to 0.95.
   - Ambiguous mentions get < 0.70.
   - Missing fields get 0.00.
9. Source field values MUST be one of:
   - "explicit": explicitly spoken
   - "explicit_relative": explicitly spoken relative date (e.g., yesterday)
   - "inferred": logically derived from context
   - "context": derived from user defaults (like currency)
   - "missing": not present in input

Return ONLY a valid JSON object matching this schema EXACTLY:
{
  "fields": {
    "amount": { "value": number | null, "confidence": number, "source": string, "raw": string | null },
    "currency": { "value": string, "confidence": number, "source": string },
    "category": { "value": string | null, "confidence": number, "source": string },
    "merchant": { "value": string | null, "confidence": number, "source": string },
    "description": { "value": string | null, "confidence": number, "source": string },
    "date": { "value": string | null, "confidence": number, "source": string },
    "payment_method": { "value": "cash" | "debit_card" | "upi" | "other" | null, "confidence": number, "source": string },
    "notes": { "value": string | null, "confidence": number, "source": string }
  },
  "overall_confidence": number,
  "explanation": string | null
}
`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1, // Low temperature for consistent deterministic extraction
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response from Gemini LLM");
      }

      const parsed: ExtractedVoiceExpense = JSON.parse(text);
      parsed.raw_transcript = cleanedTranscript;

      // Post-process category ID matching
      if (parsed.fields.category && parsed.fields.category.value) {
        const catName = parsed.fields.category.value.toLowerCase();
        const matched = categories.find(
          (c) => c.name.toLowerCase() === catName || catName.includes(c.name.toLowerCase())
        );
        parsed.fields.categoryId = {
          value: matched ? matched.id : null,
          confidence: matched ? parsed.fields.category.confidence : 0,
          source: matched ? parsed.fields.category.source : "missing",
        };
        if (matched) {
          parsed.fields.category.value = matched.name;
        }
      } else {
        parsed.fields.categoryId = { value: null, confidence: 0, source: "missing" };
      }

      // If date is missing, default date to today's date with low confidence or explicit fallback
      if (!parsed.fields.date || !parsed.fields.date.value) {
        parsed.fields.date = {
          value: currentDate,
          confidence: 0.80,
          source: "context",
        };
      }

      // Calculate overall confidence if not provided properly
      if (typeof parsed.overall_confidence !== "number" || isNaN(parsed.overall_confidence)) {
        parsed.overall_confidence = this.calculateOverallConfidence(parsed.fields);
      }

      return parsed;
    } catch (error: any) {
      logger.error("Error in parseVoiceExpense via Gemini LLM", {
        error: error.message,
        transcript: cleanedTranscript,
      });

      // Fallback deterministic parsing if LLM service fails
      return this.fallbackParse(cleanedTranscript, categories, userCurrency, currentDate);
    }
  }

  private calculateOverallConfidence(fields: ExtractedVoiceExpense["fields"]): number {
    const weights = {
      amount: 0.35,
      category: 0.20,
      merchant: 0.15,
      date: 0.15,
      payment_method: 0.10,
      description: 0.05,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const [key, weight] of Object.entries(weights)) {
      const field = (fields as any)[key] as FieldExtraction;
      if (field && typeof field.confidence === "number") {
        weightedSum += field.confidence * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  }

  private createEmptyResponse(transcript: string, currency: string): ExtractedVoiceExpense {
    return {
      raw_transcript: transcript,
      fields: {
        amount: { value: null, confidence: 0, source: "missing" },
        currency: { value: currency, confidence: 1.0, source: "context" },
        category: { value: null, confidence: 0, source: "missing" },
        categoryId: { value: null, confidence: 0, source: "missing" },
        merchant: { value: null, confidence: 0, source: "missing" },
        description: { value: null, confidence: 0, source: "missing" },
        date: { value: null, confidence: 0, source: "missing" },
        payment_method: { value: null, confidence: 0, source: "missing" },
        notes: { value: null, confidence: 0, source: "missing" },
      },
      overall_confidence: 0,
      explanation: "Empty transcript provided.",
    };
  }

  /**
   * Deterministic regex fallback if LLM endpoint fails or encounters network issue.
   */
  private fallbackParse(
    transcript: string,
    categories: UserCategoryInfo[],
    currency: string,
    currentDate: string
  ): ExtractedVoiceExpense {
    const text = transcript.toLowerCase();

    // Extract amount using regex
    let amount: number | null = null;
    let amountConf = 0;
    let amountSource: FieldExtraction["source"] = "missing";

    const kMatch = text.match(/(?:(?:rs\.?|₹|inr)\s*)?(\d+(?:\.\d+)?)\s*k\b/i);
    if (kMatch && kMatch[1]) {
      amount = parseFloat(kMatch[1]) * 1000;
      amountConf = 0.95;
      amountSource = "explicit";
    } else {
      // Look for explicit numeric patterns
      const numbers = text.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\b|\b\d+\b/g);
      if (numbers) {
        // Find candidate that isn't a date year (like 2026)
        for (const numStr of numbers) {
          const cleanNum = numStr.replace(/,/g, "");
          const val = parseFloat(cleanNum);
          if (!isNaN(val) && val > 0 && val !== 2026 && val !== 2025) {
            amount = val;
            amountConf = 0.90;
            amountSource = "explicit";
            break;
          }
        }
      }
    }


    // Extract payment method
    let pm: "cash" | "debit_card" | "upi" | "other" | null = null;
    let pmConf = 0;
    let pmSource: FieldExtraction["source"] = "missing";

    if (/\b(upi|gpay|google pay|phonepe|paytm|bhim)\b/i.test(text)) {
      pm = "upi";
      pmConf = 0.95;
      pmSource = "explicit";
    } else if (/\b(card|debit card|credit card|hdfc|sbi|icici)\b/i.test(text)) {
      pm = "debit_card";
      pmConf = 0.90;
      pmSource = "explicit";
    } else if (/\b(cash)\b/i.test(text)) {
      pm = "cash";
      pmConf = 0.95;
      pmSource = "explicit";
    }

    // Extract date
    let dateVal = currentDate;
    let dateConf = 0.80;
    let dateSource: FieldExtraction["source"] = "context";

    if (text.includes("yesterday")) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      dateVal = d.toISOString().split("T")[0];
      dateConf = 0.95;
      dateSource = "explicit_relative";
    }

    // Category matching
    let matchedCatName: string | null = null;
    let matchedCatId: string | null = null;
    let catConf = 0;

    for (const cat of categories) {
      if (text.includes(cat.name.toLowerCase())) {
        matchedCatName = cat.name;
        matchedCatId = cat.id;
        catConf = 0.90;
        break;
      }
    }

    if (!matchedCatName) {
      if (/\b(dinner|lunch|food|restaurant|burger|pizza|coffee|swiggy|zomato)\b/i.test(text)) {
        const foodCat = categories.find((c) => /food|dining|restaurant/i.test(c.name));
        if (foodCat) {
          matchedCatName = foodCat.name;
          matchedCatId = foodCat.id;
          catConf = 0.85;
        }
      }
    }

    return {
      raw_transcript: transcript,
      fields: {
        amount: { value: amount, confidence: amountConf, source: amountSource },
        currency: { value: currency, confidence: 1.0, source: "context" },
        category: { value: matchedCatName, confidence: catConf, source: matchedCatName ? "inferred" : "missing" },
        categoryId: { value: matchedCatId, confidence: catConf, source: matchedCatId ? "inferred" : "missing" },
        merchant: { value: null, confidence: 0, source: "missing" },
        description: { value: transcript, confidence: 0.70, source: "explicit" },
        date: { value: dateVal, confidence: dateConf, source: dateSource },
        payment_method: { value: pm, confidence: pmConf, source: pmSource },
        notes: { value: transcript, confidence: 0.70, source: "explicit" },
      },
      overall_confidence: 0.75,
      explanation: "Processed using fallback parser.",
    };
  }
}

export const voiceExpenseService = new VoiceExpenseService();
