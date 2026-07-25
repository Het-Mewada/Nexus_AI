import { Router } from "express";
import { spendingBehaviorController } from "../controllers/spending-behavior.controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/insights", spendingBehaviorController.getInsights.bind(spendingBehaviorController));
router.post("/analyze", spendingBehaviorController.analyze.bind(spendingBehaviorController));

export default router;
