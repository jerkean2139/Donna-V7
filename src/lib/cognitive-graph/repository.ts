import { and, desc, eq, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { cognitiveObjectRelationships } from "../../db/schema";
import type * as dbSchema from "../../db/schema";
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

export class InMemoryCognitiveGraphRepository implements CognitiveGraphRepository {
  private readonly store = new Map<string, CognitiveGraphEdge>();

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

    this.store.set(edge.id, edge);
    return edge;
  }

  async listEdgesForObject(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]> {
    return Array.from(this.store.values()).filter(
      (edge) =>
        edge.tenantId === tenantId &&
        (edge.fromObjectId === objectId || edge.toObjectId === objectId),
    );
  }

  async listOutgoingEdges(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]> {
    return Array.from(this.store.values()).filter(
      (edge) => edge.tenantId === tenantId && edge.fromObjectId === objectId,
    );
  }

  async listIncomingEdges(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]> {
    return Array.from(this.store.values()).filter(
      (edge) => edge.tenantId === tenantId && edge.toObjectId === objectId,
    );
  }
}

type CognitiveGraphEdgeRecord = typeof cognitiveObjectRelationships.$inferSelect;

export function toCognitiveGraphEdge(record: CognitiveGraphEdgeRecord): CognitiveGraphEdge {
  return {
    id: record.id,
    tenantId: record.tenantId,
    fromObjectId: record.fromObjectId,
    toObjectId: record.toObjectId,
    relationshipType: record.relationshipType,
    strength: record.strength,
    source: record.source,
    createdByUserId: record.createdByUserId,
    createdByAgentId: record.createdByAgentId,
    evidenceSummary: record.evidenceSummary,
    confirmedByUserId: record.confirmedByUserId,
    confirmedAt: record.confirmedAt,
    createdAt: record.createdAt,
  };
}

export function toCreateGraphEdgeValues(
  input: CreateCognitiveGraphEdgeRepositoryInput,
): typeof cognitiveObjectRelationships.$inferInsert {
  return {
    tenantId: input.tenantId,
    fromObjectId: input.fromObjectId,
    toObjectId: input.toObjectId,
    relationshipType: input.relationshipType,
    strength: input.strength,
    source: input.source,
    createdByUserId: input.createdByUserId ?? null,
    createdByAgentId: input.createdByAgentId ?? null,
    evidenceSummary: input.evidenceSummary ?? null,
  };
}

export class DrizzleCognitiveGraphRepository implements CognitiveGraphRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof dbSchema>) {}

  async createEdge(input: CreateCognitiveGraphEdgeRepositoryInput): Promise<CognitiveGraphEdge> {
    const [record] = await this.db
      .insert(cognitiveObjectRelationships)
      .values(toCreateGraphEdgeValues(input))
      .returning();

    if (!record) {
      throw new Error("Failed to create cognitive graph edge.");
    }

    return toCognitiveGraphEdge(record);
  }

  async listEdgesForObject(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]> {
    const records = await this.db
      .select()
      .from(cognitiveObjectRelationships)
      .where(
        and(
          eq(cognitiveObjectRelationships.tenantId, tenantId),
          or(
            eq(cognitiveObjectRelationships.fromObjectId, objectId),
            eq(cognitiveObjectRelationships.toObjectId, objectId),
          ),
        ),
      )
      .orderBy(desc(cognitiveObjectRelationships.createdAt));

    return records.map(toCognitiveGraphEdge);
  }

  async listOutgoingEdges(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]> {
    const records = await this.db
      .select()
      .from(cognitiveObjectRelationships)
      .where(
        and(
          eq(cognitiveObjectRelationships.tenantId, tenantId),
          eq(cognitiveObjectRelationships.fromObjectId, objectId),
        ),
      )
      .orderBy(desc(cognitiveObjectRelationships.createdAt));

    return records.map(toCognitiveGraphEdge);
  }

  async listIncomingEdges(objectId: string, tenantId: string): Promise<CognitiveGraphEdge[]> {
    const records = await this.db
      .select()
      .from(cognitiveObjectRelationships)
      .where(
        and(
          eq(cognitiveObjectRelationships.tenantId, tenantId),
          eq(cognitiveObjectRelationships.toObjectId, objectId),
        ),
      )
      .orderBy(desc(cognitiveObjectRelationships.createdAt));

    return records.map(toCognitiveGraphEdge);
  }
}
