import { Router } from "express";
import { knowledgeGraphController } from "../controllers/knowledge-graph.controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", knowledgeGraphController.getGraph.bind(knowledgeGraphController));
router.post("/node", knowledgeGraphController.addNode.bind(knowledgeGraphController));
router.post("/link", knowledgeGraphController.linkNodes.bind(knowledgeGraphController));

export default router;
