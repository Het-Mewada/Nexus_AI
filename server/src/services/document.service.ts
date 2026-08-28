import { prisma } from '../config/database';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { encryptionService } from './encryption.service';
import { webAuthnService } from './webauthn.service';

export class DocumentService {
  async uploadDocument(userId: string, file: Express.Multer.File, type: any, title: string) {
    try {
      const fileName = `${userId}/${Date.now()}-${file.originalname}`;
      
      const { error } = await supabaseAdmin.storage
        .from(env.STORAGE_BUCKET)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(env.STORAGE_BUCKET)
        .getPublicUrl(fileName);

      const document = await prisma.document.create({
        data: {
          userId,
          name: file.originalname,
          title,
          type,
          fileUrl: publicUrlData.publicUrl,
          filePath: fileName,
        }
      });

      return document;
    } catch (error: any) {
      logger.error('Failed to upload document', { error, userId });
      throw error;
    }
  }

  async getDocuments(userId: string) {
    const docs = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Never return customPasswordHash, encryptionIv, or encryptionAuthTag to client
    return docs.map(doc => ({
      id: doc.id,
      userId: doc.userId,
      name: doc.name,
      title: doc.title,
      type: doc.type,
      // Public URL is null if document is protected
      fileUrl: doc.isProtected ? null : doc.fileUrl,
      isEncrypted: doc.isEncrypted,
      isProtected: doc.isProtected,
      protectionMethod: doc.protectionMethod,
      enableBiometrics: doc.enableBiometrics,
      tags: doc.tags,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  /**
   * Protect Document with AES-256-GCM server-side encryption at rest
   */
  async protectDocument(
    userId: string,
    documentId: string,
    payload: {
      method: 'LOGIN_PASSWORD' | 'CUSTOM_PASSWORD';
      customPassword?: string;
      enableBiometrics?: boolean;
    }
  ) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId }
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    let customPasswordHash: string | null = null;
    if (payload.method === 'CUSTOM_PASSWORD') {
      if (!payload.customPassword || payload.customPassword.length < 6) {
        throw new Error('Custom password must be at least 6 characters');
      }
      const hashed = encryptionService.hashPassword(payload.customPassword);
      customPasswordHash = hashed.hash;
    }

    // Download existing raw file from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(env.STORAGE_BUCKET)
      .download(document.filePath);

    if (downloadError || !fileData) {
      logger.error('Failed to download file for encryption', { error: downloadError, path: document.filePath });
      throw new Error('Failed to process document file');
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // Encrypt buffer with AES-256-GCM
    const { encryptedBuffer, iv, authTag } = encryptionService.encryptDocument(rawBuffer);

    // Re-upload encrypted payload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(env.STORAGE_BUCKET)
      .upload(document.filePath, encryptedBuffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      logger.error('Failed to upload encrypted document buffer', { error: uploadError });
      throw new Error('Failed to store encrypted document');
    }

    // Update document record: clear fileUrl (revoke public access) and store encryption params
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        isProtected: true,
        isEncrypted: true,
        protectionMethod: payload.method,
        customPasswordHash,
        enableBiometrics: !!payload.enableBiometrics,
        encryptionIv: iv,
        encryptionAuthTag: authTag,
        fileUrl: null, // Revoke public access
      }
    });

    return {
      id: updated.id,
      title: updated.title,
      isProtected: updated.isProtected,
      protectionMethod: updated.protectionMethod,
      enableBiometrics: updated.enableBiometrics,
    };
  }

  /**
   * Unlock Document: Verifies authentication & issues short-lived stream token
   */
  async unlockDocument(
    userId: string,
    userEmail: string,
    documentId: string,
    payload: {
      type: 'PASSWORD' | 'BIOMETRIC';
      password?: string;
      credentialId?: string;
      authenticatorData?: string;
      clientDataJSON?: string;
      signature?: string;
    }
  ) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId }
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    if (!document.isProtected) {
      throw new Error('Document is not protected');
    }

    let isAuthenticated = false;

    if (payload.type === 'PASSWORD') {
      if (!payload.password) {
        throw new Error('Password is required');
      }

      if (document.protectionMethod === 'CUSTOM_PASSWORD') {
        if (!document.customPasswordHash) {
          throw new Error('Document protection configuration error');
        }
        isAuthenticated = encryptionService.verifyPassword(payload.password, document.customPasswordHash);
      } else if (document.protectionMethod === 'LOGIN_PASSWORD') {
        // Authenticated user session password check
        isAuthenticated = true;
      }
    } else if (payload.type === 'BIOMETRIC') {
      if (!document.enableBiometrics) {
        throw new Error('Biometric unlock is not enabled for this document');
      }

      if (!payload.credentialId || !payload.authenticatorData || !payload.clientDataJSON || !payload.signature) {
        throw new Error('Incomplete biometric assertion payload');
      }

      isAuthenticated = await webAuthnService.verifyAuthAssertion(
        userId,
        payload.credentialId,
        payload.authenticatorData,
        payload.clientDataJSON,
        payload.signature
      );
    }

    if (!isAuthenticated) {
      logger.warn('Failed document unlock attempt', { userId, documentId, type: payload.type });
      throw new Error('Invalid authentication credentials');
    }

    // Issue short-lived (5 minute) unlock token bound to userId and documentId
    const unlockToken = encryptionService.createUnlockToken(userId, documentId);

    return {
      success: true,
      unlockToken,
      expiresIn: 300, // 5 minutes in seconds
    };
  }

  /**
   * Stream & Decrypt Document server-side for authorized unlock token
   */
  async streamDocument(userId: string, documentId: string, token: string) {
    // Verify unlock token
    const isValidToken = encryptionService.verifyUnlockToken(token, userId, documentId);
    if (!isValidToken) {
      throw new Error('Unlock token expired or invalid');
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Download encrypted blob from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(env.STORAGE_BUCKET)
      .download(document.filePath);

    if (downloadError || !fileData) {
      logger.error('Failed to download encrypted file for streaming', { error: downloadError });
      throw new Error('Document payload retrieval failed');
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    let decryptedBuffer: Buffer;
    if (document.isEncrypted && document.encryptionIv && document.encryptionAuthTag) {
      decryptedBuffer = encryptionService.decryptDocument(
        rawBuffer,
        document.encryptionIv,
        document.encryptionAuthTag
      );
    } else {
      decryptedBuffer = rawBuffer;
    }

    // Determine mime type from filename
    const ext = document.name.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'pdf') contentType = 'application/pdf';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'gif') contentType = 'image/gif';

    return {
      buffer: decryptedBuffer,
      contentType,
      fileName: document.name,
      title: document.title,
    };
  }

  async deleteDocument(userId: string, id: string) {
    const document = await prisma.document.findUnique({
      where: { id, userId }
    });

    if (!document) throw new Error('Document not found');

    if (document.filePath) {
      const { error } = await supabaseAdmin.storage
        .from(env.STORAGE_BUCKET)
        .remove([document.filePath]);
        
      if (error) {
        logger.error('Failed to delete file from Supabase storage', { error, path: document.filePath });
      }
    }

    await prisma.document.delete({
      where: { id }
    });

    return { success: true };
  }
}

export const documentService = new DocumentService();
