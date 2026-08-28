import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { documentController } from '../controllers/document.controller';
import { uploadReceipt } from '../middleware/upload';

const router = Router();

// Stream route allows signed unlock tokens in query params as well as Bearer auth headers
router.get('/:id/stream', optionalAuthMiddleware, documentController.streamDocument);

router.use(authMiddleware);

router.post('/', uploadReceipt.single('file'), documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.delete('/:id', documentController.deleteDocument);

// Document Vault Locking & Protection endpoints
router.post('/:id/protect', documentController.protectDocument);
router.post('/:id/unlock', documentController.unlockDocument);

// WebAuthn Passkey Registration & Auth endpoints
router.post('/webauthn/register-challenge', documentController.getWebAuthnRegisterChallenge);
router.post('/webauthn/register-verify', documentController.verifyWebAuthnRegister);
router.post('/webauthn/auth-challenge', documentController.getWebAuthnAuthChallenge);

export default router;

