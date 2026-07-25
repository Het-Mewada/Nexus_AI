import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { taxController } from '../controllers/tax.controller';
import { validate } from '../middleware/validate';
import { createTaxProfileSchema, updateTaxProfileSchema } from '../validators/schemas';

const router = Router();

router.use(authMiddleware);

router.get('/', taxController.list);
router.post('/', validate(createTaxProfileSchema), taxController.create);
router.get('/:id', taxController.getById);
router.patch('/:id', validate(updateTaxProfileSchema), taxController.update);
router.delete('/:id', taxController.delete);

export default router;
