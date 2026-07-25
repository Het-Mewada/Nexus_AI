import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact
} from '../controllers/contacts.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getContacts);
router.get('/:id', getContact);
router.post('/', createContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

export default router;
