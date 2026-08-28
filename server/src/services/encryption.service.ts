import crypto from 'crypto';
import { logger } from '../utils/logger';

// Derive a 32-byte master encryption key from environment secret or fallback
const MASTER_KEY = crypto.scryptSync(
  process.env.DOCUMENT_ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'nexus_doc_vault_master_key_2026',
  'nexus_doc_master_salt_v1',
  32
);

export class EncryptionService {
  /**
   * Encrypt document buffer using AES-256-GCM
   */
  encryptDocument(buffer: Buffer): { encryptedBuffer: Buffer; iv: string; authTag: string } {
    try {
      const iv = crypto.randomBytes(16); // 128-bit IV for AES-GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
      
      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return {
        encryptedBuffer: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error: any) {
      logger.error('Failed to encrypt document buffer', { error });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt AES-256-GCM encrypted document buffer
   */
  decryptDocument(encryptedBuffer: Buffer, ivHex: string, authTagHex: string): Buffer {
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    } catch (error: any) {
      logger.error('Failed to decrypt document buffer', { error });
      throw new Error('Decryption failed or data integrity check failed');
    }
  }

  /**
   * Hash custom password using scrypt with unique 16-byte salt
   */
  hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return {
      hash: `${salt}:${derivedKey.toString('hex')}`,
      salt,
    };
  }

  /**
   * Verify password against scrypt hash and salt
   */
  verifyPassword(password: string, storedHashWithSalt: string): boolean {
    try {
      const [salt, storedHash] = storedHashWithSalt.split(':');
      if (!salt || !storedHash) return false;
      const derivedKey = crypto.scryptSync(password, salt, 64);
      const storedKeyBuffer = Buffer.from(storedHash, 'hex');
      return crypto.timingSafeEqual(derivedKey, storedKeyBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Create short-lived (5 min) HMAC-signed document unlock token
   */
  createUnlockToken(userId: string, docId: string): string {
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const payload = `${userId}:${docId}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', MASTER_KEY).update(payload).digest('hex');
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
  }

  /**
   * Verify short-lived HMAC-signed document unlock token
   */
  verifyUnlockToken(token: string, userId: string, docId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length !== 4) return false;
      const [tUserId, tDocId, expStr, signature] = parts;

      if (tUserId !== userId || tDocId !== docId) return false;

      const expiresAt = Number(expStr);
      if (!expiresAt || expiresAt < Date.now()) return false;

      const expectedPayload = `${tUserId}:${tDocId}:${expStr}`;
      const expectedSignature = crypto.createHmac('sha256', MASTER_KEY).update(expectedPayload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Extract userId from unlock token payload safely
   */
  extractUserIdFromToken(token: string): string | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length !== 4) return null;
      return parts[0] || null;
    } catch {
      return null;
    }
  }

}

export const encryptionService = new EncryptionService();

