import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { llmFallbackService } from './llm-fallback.service';

export class ConversationService {
  /**
   * List all conversations for a user, most recent first.
   */
  async listConversations(userId: string) {
    return prisma.aiConversation.findMany({
      where: { userId },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' }
      ],
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    });
  }

  /**
   * Get a single conversation with all messages.
   */
  async getConversation(userId: string, conversationId: string) {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }

    return conversation;
  }

  /**
   * Create a new conversation.
   */
  async createConversation(userId: string, title?: string) {
    return prisma.aiConversation.create({
      data: {
        userId,
        title: title || 'New Conversation',
      },
    });
  }

  /**
   * Delete a conversation and all its messages.
   */
  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }

    await prisma.aiConversation.delete({ where: { id: conversationId } });
    return { message: 'Conversation deleted successfully' };
  }

  /**
   * Update a conversation (title or pin status)
   */
  async updateConversation(userId: string, conversationId: string, data: { title?: string; isPinned?: boolean }) {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }

    if (data.isPinned !== undefined && data.title === undefined) {
      await prisma.$executeRaw`UPDATE ai_conversations SET is_pinned = ${data.isPinned} WHERE id = ${conversationId} AND user_id = ${userId}`;
      return { ...conversation, isPinned: data.isPinned };
    }

    if (data.title !== undefined && data.isPinned === undefined) {
      await prisma.$executeRaw`UPDATE ai_conversations SET title = ${data.title} WHERE id = ${conversationId} AND user_id = ${userId}`;
      return { ...conversation, title: data.title };
    }

    return prisma.aiConversation.update({
      where: { id: conversationId },
      data,
    });
  }

  /**
   * Send a message and get AI response with full conversation context.
   * Persists both user message and AI response.
   */
  async sendMessage(userId: string, conversationId: string, userMessage: string, financialContext: any) {
    // Verify ownership
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // Last 20 messages for context window
        },
      },
    });

    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }

    // Save user message
    const savedUserMsg = await prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: userMessage,
      },
    });

    // Filter out system messages and map roles for Gemini
    const validMessages = conversation.messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant' || m.role === 'model'
    );
    
    const geminiHistory = validMessages.map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }],
    }));

    // Fetch cross-conversation memory (recent messages from other conversations)
    const recentOtherConversations = await prisma.aiConversation.findMany({
      where: { userId, id: { not: conversationId } },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      include: {
        messages: {
          where: { role: { not: 'system' } }, // ignore raw system prompts
          orderBy: { createdAt: 'desc' },
          take: 4,
        }
      }
    });

    const crossConversationMemory = recentOtherConversations.filter(c => c.messages.length > 0).map(c => {
      const msgs = c.messages.reverse().map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
      return `[Conversation: ${c.title}]\n${msgs}`;
    }).join('\n\n');

    const systemPrompt = `You are the Nexus AI Financial Advisor, an expert personal finance assistant with complete knowledge of the user's finances.
The user's name is ${financialContext.userName}. You must remember this.

Here is the user's COMPLETE financial profile:
${JSON.stringify(financialContext, null, 2)}
${crossConversationMemory ? `\nHere are recent insights and context from the user's OTHER conversations for your cross-conversation memory:\n${crossConversationMemory}\n` : ''}
RULES:
- Always use the user's currency (${financialContext.currency || 'INR'}) with the correct symbol.
- Reference previous messages in this conversation for continuity.
- Be highly personalized, actionable, and data-driven ONLY when answering specific financial questions.
- You HAVE FULL ACCESS to their detailed transaction history (including specific merchants, personal notes, tags, dates, and amounts). If the user asks about specific notes or people, actively search the Detailed Transaction History data to answer. NEVER deny having access to this data.
- CRITICAL: Reply ONLY to what the user explicitly asks for. Do NOT provide unsolicited financial summaries, analytics, or lists of your capabilities unless explicitly requested.
- If the user just says "hello" or greets you, simply greet them back concisely and ask how you can help.
- Keep responses concise and directly address the user's prompt.
- CRITICAL DIRECTIVE: Be completely RAW, direct, candid, and blunt. Do NOT sugarcoat or butter up anything. Say what is strictly correct, real, and factual without pleasantries or fluff.`;

    try {
      const historyMessages = validMessages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'model',
        content: m.content,
      }));

      const aiContent = await llmFallbackService.generateResponse({
        systemPrompt,
        messages: historyMessages,
        userMessage,
        financialContext,
      });

      // Save AI response
      const savedAiMsg = await prisma.aiMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: aiContent,
        },
      });

      // Auto-title conversation if it's the first message
      if (conversation.messages.length === 0) {
        const titlePrompt = `Generate a concise 3-6 word title for this financial conversation. The user said: "${userMessage}". Respond with ONLY the title, no quotes.`;
        try {
          const generatedTitleRaw = await llmFallbackService.generateResponse({
            systemPrompt: "You are a concise title generator. Respond ONLY with a 3-6 word title without quotes or markdown formatting.",
            userMessage: titlePrompt,
          });
          const generatedTitle = generatedTitleRaw.trim().replace(/^["']|["']$/g, '').slice(0, 100) || 'Financial Advice';
          await prisma.aiConversation.update({
            where: { id: conversationId },
            data: { title: generatedTitle },
          });
        } catch {
          // Title generation is non-critical; ignore errors
        }
      }

      // Touch conversation updatedAt
      await prisma.aiConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return {
        userMessage: savedUserMsg,
        aiMessage: savedAiMsg,
      };
    } catch (error: any) {
      logger.error('Unexpected error in conversation service', { message: error.message, conversationId });
      
      // Even if DB or runtime throws, generate local fallback content so response never fails
      const fallbackContent = await llmFallbackService.generateResponse({
        userMessage,
        financialContext,
      });

      const fallbackMsg = await prisma.aiMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: fallbackContent,
        },
      });

      return {
        userMessage: savedUserMsg,
        aiMessage: fallbackMsg,
      };
    }
  }
}

export const conversationService = new ConversationService();
