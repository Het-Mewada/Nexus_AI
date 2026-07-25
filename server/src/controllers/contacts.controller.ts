import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { contactsService } from '../services/contacts.service';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export const getContacts = async (req: AuthRequest, res: Response) => {
  try {
    const contacts = await contactsService.getContacts(req.user!.id, req.query.search as string);
    sendSuccess(res, contacts);
  } catch (error: any) {
    logger.error('Failed to get contacts', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to get contacts' } });
  }
};

export const getContact = async (req: AuthRequest, res: Response) => {
  try {
    const contact = await contactsService.getContact(req.user!.id, req.params.id as string);
    sendSuccess(res, contact);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};

export const createContact = async (req: AuthRequest, res: Response) => {
  try {
    const contact = await contactsService.createContact(req.user!.id, req.body);
    sendSuccess(res, contact, 'Contact created', 201);
  } catch (error: any) {
    logger.error('Failed to create contact', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to create contact' } });
  }
};

export const updateContact = async (req: AuthRequest, res: Response) => {
  try {
    const contact = await contactsService.updateContact(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, contact);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};

export const deleteContact = async (req: AuthRequest, res: Response) => {
  try {
    const result = await contactsService.deleteContact(req.user!.id, req.params.id as string);
    sendSuccess(res, result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
  }
};
