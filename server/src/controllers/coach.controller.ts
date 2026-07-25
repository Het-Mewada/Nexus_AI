import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { coachService } from '../services/coach.service';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export const getDailyTip = async (req: AuthRequest, res: Response) => {
  try {
    const tip = await coachService.getDailyTip(req.user!.id);
    sendSuccess(res, tip);
  } catch (error: any) {
    logger.error('Failed to get daily tip', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to get daily tip' } });
  }
};

export const getWeeklyReview = async (req: AuthRequest, res: Response) => {
  try {
    const review = await coachService.getWeeklyReview(req.user!.id);
    sendSuccess(res, review);
  } catch (error: any) {
    logger.error('Failed to get weekly review', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to get weekly review' } });
  }
};

export const getChallenges = async (_req: AuthRequest, res: Response) => {
  try {
    const challenges = await coachService.getChallenges();
    sendSuccess(res, challenges);
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch challenges' } });
  }
};

export const getUserChallenges = async (req: AuthRequest, res: Response) => {
  try {
    const challenges = await coachService.getUserChallenges(req.user!.id);
    sendSuccess(res, challenges);
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch user challenges' } });
  }
};

export const startChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const challengeId = req.params.id as string;
    const result = await coachService.startChallenge(userId, challengeId);
    sendSuccess(res, result, 'Challenge started!', 201);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};

export const updateProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { progressPct } = req.body;
    if (progressPct === undefined || typeof progressPct !== 'number') {
      res.status(400).json({ success: false, error: { message: 'progressPct is required' } }); return;
    }
    const userId = req.user!.id;
    const challengeId = req.params.id as string;
    const result = await coachService.updateProgress(userId, challengeId, progressPct);
    sendSuccess(res, result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};

export const coachController = {
  getDailyTip,
  getWeeklyReview,
  getChallenges,
  getUserChallenges,
  startChallenge,
  updateProgress,
};
