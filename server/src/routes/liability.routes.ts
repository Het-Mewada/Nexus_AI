import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createLoanSchema, updateLoanSchema, createInsuranceSchema, updateInsuranceSchema } from '../validators/schemas';
import { liabilityController } from '../controllers/liability.controller';

const router = Router();

router.use(authMiddleware);

// Loans
router.get('/loans', liabilityController.getLoans);
router.post('/loans', validate(createLoanSchema), liabilityController.addLoan);
router.patch('/loans/:id', validate(updateLoanSchema), liabilityController.updateLoan);
router.delete('/loans/:id', liabilityController.deleteLoan);

// Insurance
router.get('/insurance', liabilityController.getInsurancePolicies);
router.post('/insurance', validate(createInsuranceSchema), liabilityController.addInsurance);
router.patch('/insurance/:id', validate(updateInsuranceSchema), liabilityController.updateInsurance);
router.delete('/insurance/:id', liabilityController.deleteInsurance);

export default router;
