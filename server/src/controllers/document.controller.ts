import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { documentService } from '../services/document.service';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { type, title } = req.body;
    const file = req.file;

    if (!file) { res.status(400).json({ success: false, error: { message: 'File is required' } }); return; }
    if (!type || !title) { res.status(400).json({ success: false, error: { message: 'Type and title are required' } }); return; }

    const document = await documentService.uploadDocument(req.user!.id, file as Express.Multer.File, type, title);
    sendSuccess(res, document, 'Document uploaded successfully', 201);
  } catch (error) {
    logger.error('Failed to upload document', { error });
    throw error; return;
  }
};

export const getDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const documents = await documentService.getDocuments(req.user!.id);
    sendSuccess(res, documents);
  } catch (error) {
    logger.error('Failed to get documents', { error });
    throw error; return;
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await documentService.deleteDocument(req.user!.id, id as string);
    sendSuccess(res, null, 'Document deleted successfully');
  } catch (error: any) {
    logger.error('Failed to delete document', { error });
    throw error; return;
  }
};

export const documentController = {
  uploadDocument,
  getDocuments,
  deleteDocument,
};
