import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { documentService } from '../services/document.service';
import { webAuthnService } from '../services/webauthn.service';
import { encryptionService } from '../services/encryption.service';
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
    throw error;
  }
};

export const getDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const documents = await documentService.getDocuments(req.user!.id);
    sendSuccess(res, documents);
  } catch (error) {
    logger.error('Failed to get documents', { error });
    throw error;
  }
};

export const protectDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { method, customPassword, enableBiometrics } = req.body;

    if (!method || (method !== 'LOGIN_PASSWORD' && method !== 'CUSTOM_PASSWORD')) {
      res.status(400).json({ success: false, error: { message: 'Valid protection method (LOGIN_PASSWORD or CUSTOM_PASSWORD) is required' } });
      return;
    }

    const result = await documentService.protectDocument(req.user!.id, id as string, {
      method,
      customPassword,
      enableBiometrics: !!enableBiometrics,
    });

    sendSuccess(res, result, 'Document protected successfully');
  } catch (error: any) {
    logger.error('Failed to protect document', { error });
    res.status(400).json({ success: false, error: { message: error.message || 'Failed to protect document' } });
  }
};

export const unlockDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, password, credentialId, authenticatorData, clientDataJSON, signature } = req.body;

    if (!type || (type !== 'PASSWORD' && type !== 'BIOMETRIC')) {
      res.status(400).json({ success: false, error: { message: 'Valid unlock type (PASSWORD or BIOMETRIC) is required' } });
      return;
    }

    const result = await documentService.unlockDocument(req.user!.id, req.user!.email, id as string, {
      type,
      password,
      credentialId,
      authenticatorData,
      clientDataJSON,
      signature,
    });

    sendSuccess(res, result, 'Document unlocked successfully');
  } catch (error: any) {
    logger.error('Failed to unlock document', { error });
    res.status(401).json({ success: false, error: { message: error.message || 'Invalid authentication credentials' } });
  }
};

export const streamDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const token = (req.query.token as string) || (req.headers['x-unlock-token'] as string);

    if (!token) {
      res.status(401).json({ success: false, error: { message: 'Unlock token is required to access protected document stream' } });
      return;
    }

    let userId = req.user?.id;
    if (!userId) {
      userId = encryptionService.extractUserIdFromToken(token) || undefined;
    }

    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Invalid unlock token structure' } });
      return;
    }

    const { buffer, contentType, fileName } = await documentService.streamDocument(userId, id as string, token);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(buffer);
  } catch (error: any) {
    logger.error('Failed to stream document', { error });
    res.status(403).json({ success: false, error: { message: error.message || 'Access denied' } });
  }
};


export const getWebAuthnRegisterChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const challenge = webAuthnService.generateRegistrationChallenge(req.user!.id, req.user!.email);
    sendSuccess(res, challenge);
  } catch (error: any) {
    logger.error('Failed to generate WebAuthn register challenge', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to generate WebAuthn challenge' } });
  }
};

export const verifyWebAuthnRegister = async (req: AuthRequest, res: Response) => {
  try {
    const { credentialId, publicKey, transports } = req.body;
    if (!credentialId || !publicKey) {
      res.status(400).json({ success: false, error: { message: 'Credential ID and Public Key are required' } });
      return;
    }

    const passkey = await webAuthnService.savePasskeyCredential(
      req.user!.id,
      credentialId,
      publicKey,
      transports || []
    );

    sendSuccess(res, { id: passkey.id, credentialId: passkey.credentialId }, 'Biometric passkey registered successfully');
  } catch (error: any) {
    logger.error('Failed to verify WebAuthn register', { error });
    res.status(400).json({ success: false, error: { message: error.message || 'Passkey registration failed' } });
  }
};

export const getWebAuthnAuthChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const challenge = await webAuthnService.generateAuthChallenge(req.user!.id);
    sendSuccess(res, challenge);
  } catch (error: any) {
    logger.error('Failed to generate WebAuthn auth challenge', { error });
    res.status(500).json({ success: false, error: { message: 'Failed to generate WebAuthn challenge' } });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await documentService.deleteDocument(req.user!.id, id as string);
    sendSuccess(res, null, 'Document deleted successfully');
  } catch (error: any) {
    logger.error('Failed to delete document', { error });
    throw error;
  }
};

export const documentController = {
  uploadDocument,
  getDocuments,
  protectDocument,
  unlockDocument,
  streamDocument,
  getWebAuthnRegisterChallenge,
  verifyWebAuthnRegister,
  getWebAuthnAuthChallenge,
  deleteDocument,
};
