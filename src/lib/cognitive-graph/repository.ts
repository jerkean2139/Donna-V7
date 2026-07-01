import type { CognitiveGraphEdge } from "./types";
import type { RelationshipType } from "../cognitive-object/types";

export interface CreateCognitiveGraphEdgeRepositoryInput {
  tenantId: string;
  fromObjectId: string;
  toObjectId: string;
  relationshipType: RelationshipType;
  strength: number;
  source: CognitiveGraphEdge["source"];
  createdByUserId?: string | null;
  createdByAgentId?: string | null;
  evidenceSummary?: string | null;
}

export interface CognitiveGraphRepository {
  createEdge(input: CreateCognitiveGraphEdgeRepositoryInput): Promise<CognitiveGraphEdge>;
  listEdgesForObject(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]>;
  listOutgoingEdges(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]>;
  listIncomingEdges(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]>;
}

const edgeStore = new Map<string, CognitiveGraphEdge>();

export class InMemoryCognitiveGraphRepository implements CognitiveGraphRepository {
  async createEdge(input: CreateCognitiveGraphEdgeRepositoryInput): Promise<CognitiveGraphEdge> {
    const edge: CognitiveGraphEdge = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      fromObjectId: input.fromObjectId,
      toObjectId: input.toObjectId,
      relationshipType: input.relationshipType,
      strength: input.strength,
      source: input.source,
      createdByUserId: input.createdByUserId ?? null,
      createdByAgentId: input.createdByAgentId ?? null,
      evidenceSummary: input.evidenceSummary ?? null,
      confirmedByUserId: null,
      confirmedAt: null,
      createdAt: new Date(),
    };

    edgeStore.set(edge.id, edge);
    return edge;
  }

  async listEdgesForObject(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]> {
    return Array.from(edgeStore.values()).filter(
      (edge) =>
        edge.tenantId === tenantId &&
        (edge.fromObjectId === objectId || edge.toObjectId === objectId),
    );
  }

  async listOutgoingEdges(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]> {
    return Array.from(edgeStore.values()).filter(
      (edge) => edge.tenantId === tenantId && edge.fromObjectId === objectId,
    );
  }

  async listIncomingEdges(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]> {
    return Array.from(edgeStore.values()).filter(
      (edge) => edge.tenantId === tenantId && edge.toObjectId === objectId,
    );
  }
}

export const cognitiveGraphRepository: CognitiveGraphRepository =
  new InMemoryCognitiveGraphRepository();
