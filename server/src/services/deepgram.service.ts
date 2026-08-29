import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface DeepgramTranscriptionResult {
  transcript: string;
  confidence: number;
  provider: "deepgram" | "fallback";
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export class DeepgramService {
  /**
   * Transcribes raw audio buffer using Deepgram Nova-2 API
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    mimetype: string = "audio/webm",
    language: string = "en-IN"
  ): Promise<DeepgramTranscriptionResult> {
    const apiKey = env.DEEPGRAM_API_KEY || process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      logger.warn("⚠️ DEEPGRAM_API_KEY is not configured in server environment.");
      throw new Error("DEEPGRAM_API_KEY is not configured on the server. Please add your key to server/.env.");
    }

    try {
      const url = `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&language=${encodeURIComponent(language)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": mimetype || "audio/webm",
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Deepgram API returned HTTP ${response.status}:`, errorText);
        throw new Error(`Deepgram API Error (${response.status}): ${errorText || response.statusText}`);
      }

      const data: any = await response.json();
      const alternatives = data?.results?.channels?.[0]?.alternatives?.[0];
      const transcript = alternatives?.transcript || "";
      const confidence = alternatives?.confidence || 0;
      const words = alternatives?.words || [];

      logger.info(`✅ Deepgram Nova-2 transcription complete: "${transcript}" (confidence: ${confidence})`);

      return {
        transcript: transcript.trim(),
        confidence,
        provider: "deepgram",
        words,
      };
    } catch (err: any) {
      logger.error("❌ Deepgram STT Service Error:", err?.message || err);
      throw err;
    }
  }
}

export const deepgramService = new DeepgramService();
