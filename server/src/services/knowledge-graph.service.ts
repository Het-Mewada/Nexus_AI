import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export class KnowledgeGraphService {
  /**
   * Add a new node to the Knowledge Graph
   */
  async addNode(userId: string, nodeType: string, entityId: string, label: string, properties: any = {}) {
    try {
      return await prisma.knowledgeGraphNode.create({
        data: {
          userId,
          nodeType,
          entityId,
          label,
          properties
        }
      });
    } catch (error: any) {
      logger.error('Failed to add knowledge graph node', { error: error.message });
      throw new Error('Could not add node to knowledge graph');
    }
  }

  /**
   * Link two entities (stored in properties since we lack an edge table)
   */
  async linkNodes(userId: string, sourceEntityId: string, targetEntityId: string, relationType: string) {
    const source = await prisma.knowledgeGraphNode.findFirst({ where: { userId, entityId: sourceEntityId } });
    if (!source) throw new Error("Source node not found");

    const props: any = source.properties || { links: [] };
    if (!props.links) props.links = [];
    
    // Add relation if not exists
    const exists = props.links.some((l: any) => l.targetId === targetEntityId && l.relation === relationType);
    if (!exists) {
      props.links.push({ targetId: targetEntityId, relation: relationType });
      await prisma.knowledgeGraphNode.update({
        where: { id: source.id },
        data: { properties: props }
      });
    }
    
    return { success: true };
  }

  /**
   * Retrieve all nodes for the user
   */
  async getGraph(userId: string) {
    const nodes = await prisma.knowledgeGraphNode.findMany({ where: { userId } });
    return nodes;
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
