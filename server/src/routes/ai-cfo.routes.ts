import { Router } from "express";
import { aiCfoController } from "../controllers/ai-cfo.controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/recommendations", aiCfoController.getRecommendations.bind(aiCfoController));
router.patch("/recommendations/:id/status", aiCfoController.updateRecommendationStatus.bind(aiCfoController));
router.post("/recommendations/generate", aiCfoController.generateManual.bind(aiCfoController));

export default router;
