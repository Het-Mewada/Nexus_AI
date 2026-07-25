import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { conversationService } from '../services/conversation.service';
import { financialAgentService } from '../services/financial-agent.service';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export const listConversations = async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await conversationService.listConversations(req.user!.id);
    sendSuccess(res, conversations);
  } catch (error: any) {
    logger.error('Failed to list conversations', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to list conversations' } });
  }
};

export const getConversation = async (req: AuthRequest, res: Response) => {
  try {
    const conversation = await conversationService.getConversation(req.user!.id, req.params.id as string);
    sendSuccess(res, conversation);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};

export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const conversation = await conversationService.createConversation(req.user!.id, req.body.title);
    sendSuccess(res, conversation, 'Conversation created', 201);
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to create conversation' } });
  }
};

export const deleteConversation = async (req: AuthRequest, res: Response) => {
  try {
    const result = await conversationService.deleteConversation(req.user!.id, req.params.id as string);
    sendSuccess(res, result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};

export const updateConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { title, isPinned } = req.body;
    const conversation = await conversationService.updateConversation(req.user!.id, req.params.id as string, { title, isPinned });
    sendSuccess(res, conversation);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: { message: 'Message is required' } }); return;
    }

    const financialContext = await financialAgentService.getUserFinancialContext(req.user!.id);
    const result = await conversationService.sendMessage(req.user!.id, req.params.id as string, message, financialContext);
    sendSuccess(res, result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};

// Agent insights
export const getAgentInsights = async (req: AuthRequest, res: Response) => {
  try {
    const insights = await financialAgentService.getInsights(req.user!.id);
    sendSuccess(res, insights);
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch insights' } });
  }
};

export const runAgentAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    await financialAgentService.runAgentAnalysis(req.user!.id);
    const insights = await financialAgentService.getInsights(req.user!.id);
    sendSuccess(res, insights, 'Analysis complete');
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to run analysis' } });
  }
};

export const markInsightRead = async (req: AuthRequest, res: Response) => {
  try {
    await financialAgentService.markInsightRead(req.user!.id, req.params.id as string);
    sendSuccess(res, { message: 'Insight marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to mark insight' } });
  }
};

export const dismissInsight = async (req: AuthRequest, res: Response) => {
  try {
    await financialAgentService.dismissInsight(req.user!.id, req.params.id as string);
    sendSuccess(res, { message: 'Insight dismissed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to dismiss insight' } });
  }
};

export const conversationController = {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  sendMessage,
  getAgentInsights,
  runAgentAnalysis,
  markInsightRead,
  dismissInsight,
};
