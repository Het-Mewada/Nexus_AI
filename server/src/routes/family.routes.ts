import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { familyController } from '../controllers/family.controller';

const router = Router();

router.use(authMiddleware);

// Family Groups
router.post('/', familyController.createGroup);
router.post('/join', familyController.joinGroup);
router.get('/', familyController.getMyGroups);

// Shared Wallets
router.get('/:groupId/wallets', familyController.getWallets);
router.post('/:groupId/wallets', familyController.createWallet);
router.patch('/wallets/:id', familyController.updateWallet);
router.delete('/wallets/:id', familyController.deleteWallet);

// Wallet Transactions
router.get('/:groupId/logs', familyController.getGroupTransactions);
router.get('/wallets/:walletId/transactions', familyController.getWalletTransactions);
router.post('/wallets/:walletId/transactions', familyController.addWalletTransaction);

export default router;
