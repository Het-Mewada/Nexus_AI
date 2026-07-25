import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AddressesService } from '../services/addresses.service';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

const addressesService = new AddressesService();

export const listAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const addresses = await addressesService.getAddresses(req.user!.id, req.query.search as string);
    sendSuccess(res, addresses, 'Addresses retrieved successfully');
  } catch (error: any) {
    logger.error('Failed to get addresses', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to get addresses' } });
  }
};

export const getAddressById = async (req: AuthRequest, res: Response) => {
  try {
    const address = await addressesService.getAddress(req.user!.id, req.params.id as string);
    sendSuccess(res, address, 'Address retrieved successfully');
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};

export const createAddress = async (req: AuthRequest, res: Response) => {
  try {
    const address = await addressesService.createAddress(req.user!.id, req.body);
    sendSuccess(res, address, 'Address created successfully', 201);
  } catch (error: any) {
    logger.error('Failed to create address', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to create address' } });
  }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
  try {
    const address = await addressesService.updateAddress(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, address, 'Address updated successfully');
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
  try {
    const result = await addressesService.deleteAddress(req.user!.id, req.params.id as string);
    sendSuccess(res, result, 'Address deleted successfully');
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};
