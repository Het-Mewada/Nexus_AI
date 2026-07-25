import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  listAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress
} from '../controllers/addresses.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', listAddresses);
router.get('/:id', getAddressById);
router.post('/', createAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);

export default router;
