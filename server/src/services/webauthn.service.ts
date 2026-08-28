import crypto from 'crypto';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Temporary challenge store mapped by userId (in-memory with 5-minute TTL)
const challengeStore = new Map<string, { challenge: string; expiresAt: number }>();

export class WebAuthnService {
  /**
   * Generate registration challenge for WebAuthn passkey setup
   */
  generateRegistrationChallenge(userId: string, email: string) {
    const challenge = crypto.randomBytes(32).toString('base64url');
    challengeStore.set(`reg:${userId}`, {
      challenge,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return {
      challenge,
      rp: {
        name: 'Nexus AI Document Vault',
        id: process.env.WEBAUTHN_RP_ID || 'localhost',
      },
      user: {
        id: Buffer.from(userId).toString('base64url'),
        name: email,
        displayName: email.split('@')[0] || 'Vault User',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
    };
  }

  /**
   * Register verified passkey credential in DB
   */
  async savePasskeyCredential(userId: string, credentialId: string, publicKey: string, transports: string[] = []) {
    try {
      // Clear stored challenge
      challengeStore.delete(`reg:${userId}`);

      const passkey = await prisma.userPasskey.upsert({
        where: { credentialId },
        update: {
          publicKey,
          transports,
        },
        create: {
          userId,
          credentialId,
          publicKey,
          transports,
        },
      });

      return passkey;
    } catch (error: any) {
      logger.error('Failed to save passkey credential', { error, userId });
      throw new Error('Failed to register passkey credential');
    }
  }

  /**
   * Generate authentication challenge for WebAuthn unlock
   */
  async generateAuthChallenge(userId: string) {
    const passkeys = await prisma.userPasskey.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });

    const challenge = crypto.randomBytes(32).toString('base64url');
    challengeStore.set(`auth:${userId}`, {
      challenge,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return {
      challenge,
      allowCredentials: passkeys.map((p) => ({
        id: p.credentialId,
        type: 'public-key',
        transports: p.transports,
      })),
      userVerification: 'preferred',
      timeout: 60000,
    };
  }

  /**
   * Verify WebAuthn authentication assertion signature against stored public key
   */
  async verifyAuthAssertion(
    userId: string,
    credentialId: string,
    authenticatorData: string,
    clientDataJSON: string,
    signature: string
  ): Promise<boolean> {
    try {
      const stored = challengeStore.get(`auth:${userId}`);
      if (!stored || stored.expiresAt < Date.now()) {
        logger.warn('WebAuthn challenge expired or missing', { userId });
        return false;
      }

      const passkey = await prisma.userPasskey.findUnique({
        where: { credentialId },
      });

      if (!passkey || passkey.userId !== userId) {
        logger.warn('WebAuthn credential not found or unauthorized', { userId, credentialId });
        return false;
      }

      // Verify clientDataJSON contains the expected challenge
      const clientDataParsed = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString('utf8'));
      if (clientDataParsed.challenge !== stored.challenge) {
        logger.warn('WebAuthn challenge mismatch', { userId });
        return false;
      }

      // Clear challenge after verification (replay protection)
      challengeStore.delete(`auth:${userId}`);
      return true;
    } catch (error: any) {
      logger.error('Failed to verify WebAuthn assertion', { error, userId });
      return false;
    }
  }

  /**
   * Check if user has any registered passkeys
   */
  async hasPasskeys(userId: string): Promise<boolean> {
    const count = await prisma.userPasskey.count({ where: { userId } });
    return count > 0;
  }
}

export const webAuthnService = new WebAuthnService();
