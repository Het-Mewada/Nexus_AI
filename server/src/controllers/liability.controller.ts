import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { loanService } from '../services/loan.service';
import { insuranceService } from '../services/insurance.service';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export const getLoans = async (req: AuthRequest, res: Response) => {
  try {
    const loans = await loanService.getLoans(req.user!.id);
    sendSuccess(res, loans);
  } catch (error) {
    logger.error('Failed to get loans', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to fetch loans' } });
  }
};

export const addLoan = async (req: AuthRequest, res: Response) => {
  try {
    const loan = await loanService.addLoan(req.user!.id, req.body);
    sendSuccess(res, loan, 'Loan added successfully', 201);
  } catch (error) {
    logger.error('Failed to add loan', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to add loan' } });
  }
};

export const updateLoan = async (req: AuthRequest, res: Response) => {
  try {
    const loan = await loanService.updateLoan(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, loan, 'Loan updated successfully');
  } catch (error: any) {
    logger.error('Failed to update loan', { error });
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to update loan' } });
  }
};

export const deleteLoan = async (req: AuthRequest, res: Response) => {
  try {
    const result = await loanService.deleteLoan(req.user!.id, req.params.id as string);
    sendSuccess(res, result, 'Loan deleted successfully');
  } catch (error: any) {
    logger.error('Failed to delete loan', { error });
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to delete loan' } });
  }
};

export const getInsurancePolicies = async (req: AuthRequest, res: Response) => {
  try {
    const policies = await insuranceService.getInsurancePolicies(req.user!.id);
    sendSuccess(res, policies);
  } catch (error) {
    logger.error('Failed to get insurance policies', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to fetch insurance policies' } });
  }
};

export const addInsurance = async (req: AuthRequest, res: Response) => {
  try {
    const policy = await insuranceService.addInsurance(req.user!.id, req.body);
    sendSuccess(res, policy, 'Insurance added successfully', 201);
  } catch (error) {
    logger.error('Failed to add insurance', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to add insurance' } });
  }
};

export const updateInsurance = async (req: AuthRequest, res: Response) => {
  try {
    const policy = await insuranceService.updateInsurance(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, policy, 'Insurance updated successfully');
  } catch (error: any) {
    logger.error('Failed to update insurance', { error });
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to update insurance' } });
  }
};

export const deleteInsurance = async (req: AuthRequest, res: Response) => {
  try {
    const result = await insuranceService.deleteInsurance(req.user!.id, req.params.id as string);
    sendSuccess(res, result, 'Insurance deleted successfully');
  } catch (error: any) {
    logger.error('Failed to delete insurance', { error });
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to delete insurance' } });
  }
};

export const liabilityController = {
  getLoans,
  addLoan,
  updateLoan,
  deleteLoan,
  getInsurancePolicies,
  addInsurance,
  updateInsurance,
  deleteInsurance,
};
