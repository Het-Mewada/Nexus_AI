import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { familyService } from '../services/family.service';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ success: false, error: { message: 'Group name is required' } }); return; }

    const group = await familyService.createGroup(req.user!.id, name);
    sendSuccess(res, group, 'Family group created successfully', 201);
  } catch (error) {
    logger.error('Failed to create family group', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to create family group' } });
  }
};
export const joinGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) { res.status(400).json({ success: false, error: { message: 'Invite code is required' } }); return; }

    const member = await familyService.joinGroup(req.user!.id, inviteCode);
    sendSuccess(res, member, 'Joined family group successfully', 200);
  } catch (error: any) {
    logger.error('Failed to join family group', { error });
    res.status(400).json({ success: false, error: { message: error.message || 'Failed to join family group' } });
  }
};

export const getMyGroups = async (req: AuthRequest, res: Response) => {
  try {
    const groups = await familyService.getMyGroups(req.user!.id);
    sendSuccess(res, groups);
  } catch (error) {
    logger.error('Failed to get family groups', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to fetch family groups' } });
  }
};

export const createWallet = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ success: false, error: { message: 'Wallet name is required' } }); return; }

    const wallet = await familyService.createWallet(req.user!.id, req.params.groupId as string, name);
    sendSuccess(res, wallet, 'Shared wallet created successfully', 201);
  } catch (error: any) {
    logger.error('Failed to create shared wallet', { error });
    res.status(400).json({ success: false, error: { message: error.message || 'Failed to create shared wallet' } });
  }
};

export const getWallets = async (req: AuthRequest, res: Response) => {
  try {
    const wallets = await familyService.getWallets(req.user!.id, req.params.groupId as string);
    sendSuccess(res, wallets);
  } catch (error: any) {
    logger.error('Failed to get shared wallets', { error });
    res.status(400).json({ success: false, error: { message: error.message || 'Failed to fetch shared wallets' } });
  }
};

export const updateWallet = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: { message: 'Wallet name is required' } });
      return;
    }

    const wallet = await familyService.updateWallet(req.user!.id, req.params.id as string, name);
    sendSuccess(res, wallet, 'Shared wallet updated successfully');
  } catch (error: any) {
    logger.error('Failed to update shared wallet', { error });
    res.status(400).json({ success: false, error: { message: error.message || 'Failed to update shared wallet' } });
  }
};

export const deleteWallet = async (req: AuthRequest, res: Response) => {
  try {
    await familyService.deleteWallet(req.user!.id, req.params.id as string);
    sendSuccess(res, null, 'Shared wallet deleted successfully');
  } catch (error: any) {
    logger.error('Failed to delete shared wallet', { error });
    res.status(400).json({ success: false, error: { message: error.message || 'Failed to delete shared wallet' } });
  }
};

import { z } from 'zod';

export const createWalletTransactionSchema = z.object({
  type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
});

export const addWalletTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { type, amount, description } = req.body;
    if (!type || !amount) {
      res.status(400).json({ success: false, error: { message: 'Type and amount are required' } });
      return;
    }

    const validation = createWalletTransactionSchema.safeParse({ 
      type, 
      amount: Number(amount), 
      description 
    });

    if (!validation.success) {
      res.status(400).json({ success: false, error: { message: validation.error.errors[0].message } });
      return;
    }

    const transaction = await familyService.addWalletTransaction(
      req.user!.id, 
      req.params.walletId as string, 
      validation.data
    );
    sendSuccess(res, transaction, 'Transaction added successfully', 201);
  } catch (error: any) {
    logger.error('Failed to add wallet transaction', { error });
    res.status(400).json({ success: false, error: { message: error.message || 'Failed to add transaction' } });
  }
};

export const getWalletTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await familyService.getWalletTransactions(req.user!.id, req.params.walletId as string);
    sendSuccess(res, transactions);
  } catch (error: any) {
    logger.error('Failed to get wallet transactions', { error });
    res.status(400).json({ success: false, error: { message: error.message || 'Failed to fetch transactions' } });
  }
};

export const familyController = {
  createGroup,
  joinGroup,
  getMyGroups,
  createWallet,
  getWallets,
  updateWallet,
  deleteWallet,
  addWalletTransaction,
  getWalletTransactions,
};
