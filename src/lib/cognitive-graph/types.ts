import type { CognitiveObjectType, RelationshipType } from "../cognitive-object/types";

export const relationshipSources = [
  "human",
  "system_rule",
  "ai_inferred",
  "integration_metadata",
  "import_process",
] as const;

export type RelationshipSource = (typeof relationshipSources)[number];

export interface CognitiveGraphNode {
  id: string;
  tenantId: string;
  objectType: CognitiveObjectType;
  title: string;
  summary?: string | null;
  projectId?: string | null;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CognitiveGraphEdge {
  id: string;
  tenantId: string;
  fromObjectId: string;
  toObjectId: string;
  relationshipType: RelationshipType;
  strength: number;
  source: RelationshipSource;
  createdByUserId?: string | null;
  createdByAgentId?: string | null;
  evidenceSummary?: string | null;
  confirmedByUserId?: string | null;
  confirmedAt?: Date | null;
  createdAt: Date;
}

export interface GraphTraversalRequest {
  tenantId: string;
  objectId: string;
  maxDepth?: number;
  minStrength?: number;
  includeRelationshipTypes?: RelationshipType[];
  includeInferred?: boolean;
}

export interface GraphTraversalResult {
  rootObjectId: string;
  nodes: CognitiveGraphNode[];
  edges: CognitiveGraphEdge[];
  contextSummary: string;
}
