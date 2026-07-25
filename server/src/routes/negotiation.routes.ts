import { Router } from "express";
import { negotiationController } from "../controllers/negotiation.controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.post("/start", negotiationController.startNegotiation.bind(negotiationController));

export default router;
