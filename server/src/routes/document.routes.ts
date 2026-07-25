import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { documentController } from '../controllers/document.controller';
import { uploadReceipt } from '../middleware/upload';

const router = Router();

router.use(authMiddleware);

router.post('/', uploadReceipt.single('file'), documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.delete('/:id', documentController.deleteDocument);

export default router;
