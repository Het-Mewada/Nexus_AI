import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { knowledgeGraphService } from "../services/knowledge-graph.service";
import { logger } from "../utils/logger";

export class KnowledgeGraphController {
  async getGraph(req: AuthRequest, res: Response): Promise<void> {
    try {
      const graph = await knowledgeGraphService.getGraph(req.user!.id);
      res.json(graph);
    } catch (error: any) {
      logger.error("Error fetching knowledge graph", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async addNode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { nodeType, entityId, label, properties } = req.body;
      const node = await knowledgeGraphService.addNode(req.user!.id, nodeType, entityId, label, properties);
      res.status(201).json(node);
    } catch (error: any) {
      logger.error("Error adding knowledge graph node", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async linkNodes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sourceEntityId, targetEntityId, relationType } = req.body;
      const result = await knowledgeGraphService.linkNodes(req.user!.id, sourceEntityId, targetEntityId, relationType);
      res.json(result);
    } catch (error: any) {
      logger.error("Error linking knowledge graph nodes", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const knowledgeGraphController = new KnowledgeGraphController();
