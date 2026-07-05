import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { cognitiveObjects } from "../../db/schema";
import type * as dbSchema from "../../db/schema";
import type { CognitiveObject } from "./types";

export interface CreateCognitiveObjectRepositoryInput {
  tenantId: string;
  createdByUserId: string;
  objectType: CognitiveObject["objectType"];
  title: string;
  objective?: string | null;
  summary?: string | null;
  body?: string | null;
  source: CognitiveObject["source"];
  riskLevel: CognitiveObject["riskLevel"];
  tags: string[];
  metadata?: Record<string, unknown>;
  // Set at creation only -- Cognitive Objects have no update path today, so
  // there is no re-embed-on-write case yet. Never part of the public
  // CognitiveObject type; see toCognitiveObject below.
  embedding?: number[] | null;
}

export interface SemanticNeighbor {
  objectId: string;
  similarity: number;
}

export interface ListByTenantOptions {
  limit?: number;
  offset?: number;
}

// Every tenant listing is bounded so a large workspace can never pull an
// unbounded result set through a page render.
export const DEFAULT_LIST_LIMIT = 100;
export const MAX_LIST_LIMIT = 200;

export function clampListOptions(options?: ListByTenantOptions): Required<ListByTenantOptions> {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIST_LIMIT, 1), MAX_LIST_LIMIT);
  const offset = Math.max(options?.offset ?? 0, 0);
  return { limit, offset };
}

export interface CognitiveObjectRepository {
  create(input: CreateCognitiveObjectRepositoryInput): Promise<CognitiveObject>;
  listByTenant(tenantId: string, options?: ListByTenantOptions): Promise<CognitiveObject[]>;
  findByIdForTenant(id: string, tenantId: string): Promise<CognitiveObject | null>;
  // Cosine-nearest other objects in the same tenant to the given object's
  // own stored embedding, highest similarity first. Returns [] if the
  // object has no embedding yet (provider call failed or hasn't run) or
  // doesn't belong to the tenant -- callers treat that as "no semantic
  // context available," never an error.
  findSemanticNeighbors(objectId: string, tenantId: string, limit: number): Promise<SemanticNeighbor[]>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

export class InMemoryCognitiveObjectRepository implements CognitiveObjectRepository {
  private readonly store = new Map<string, CognitiveObject>();
  private readonly embeddings = new Map<string, number[]>();

  async create(input: CreateCognitiveObjectRepositoryInput): Promise<CognitiveObject> {
    const now = new Date();
    const object: CognitiveObject = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      projectId: null,
      createdByUserId: input.createdByUserId,
      objectType: input.objectType,
      title: input.title,
      objective: input.objective ?? null,
      summary: input.summary ?? null,
      body: input.body ?? null,
      status: "draft",
      source: input.source,
      riskLevel: input.riskLevel,
      confidenceScore: null,
      tags: input.tags,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.store.set(object.id, object);
    if (input.embedding) {
      this.embeddings.set(object.id, input.embedding);
    }
    return object;
  }

  async listByTenant(tenantId: string, options?: ListByTenantOptions): Promise<CognitiveObject[]> {
    const { limit, offset } = clampListOptions(options);
    return Array.from(this.store.values())
      .filter((object) => object.tenantId === tenantId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async findByIdForTenant(id: string, tenantId: string): Promise<CognitiveObject | null> {
    const object = this.store.get(id);

    if (!object || object.tenantId !== tenantId) {
      return null;
    }

    return object;
  }

  async findSemanticNeighbors(objectId: string, tenantId: string, limit: number): Promise<SemanticNeighbor[]> {
    const source = await this.findByIdForTenant(objectId, tenantId);
    const sourceEmbedding = source ? this.embeddings.get(objectId) : undefined;
    if (!sourceEmbedding) {
      return [];
    }

    return Array.from(this.embeddings.entries())
      .filter(([id, embedding]) => id !== objectId && this.store.get(id)?.tenantId === tenantId && embedding.length === sourceEmbedding.length)
      .map(([id, embedding]) => ({ objectId: id, similarity: cosineSimilarity(sourceEmbedding, embedding) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}

type CognitiveObjectRecord = typeof cognitiveObjects.$inferSelect;

export function toCognitiveObject(record: CognitiveObjectRecord): CognitiveObject {
  return {
    id: record.id,
    tenantId: record.tenantId,
    projectId: record.projectId,
    createdByUserId: record.createdByUserId,
    objectType: record.objectType,
    title: record.title,
    objective: record.objective,
    summary: record.summary,
    body: record.body,
    status: record.status,
    source: record.source,
    riskLevel: record.riskLevel,
    confidenceScore: record.confidenceScore,
    tags: record.tags,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toCreateCognitiveObjectValues(
  input: CreateCognitiveObjectRepositoryInput,
): typeof cognitiveObjects.$inferInsert {
  return {
    tenantId: input.tenantId,
    createdByUserId: input.createdByUserId,
    objectType: input.objectType,
    title: input.title,
    objective: input.objective ?? null,
    summary: input.summary ?? null,
    body: input.body ?? null,
    source: input.source,
    riskLevel: input.riskLevel,
    tags: input.tags,
    metadata: input.metadata ?? {},
    embedding: input.embedding ?? null,
  };
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export class DrizzleCognitiveObjectRepository implements CognitiveObjectRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof dbSchema>) {}

  async create(input: CreateCognitiveObjectRepositoryInput): Promise<CognitiveObject> {
    const [record] = await this.db
      .insert(cognitiveObjects)
      .values(toCreateCognitiveObjectValues(input))
      .returning();

    if (!record) {
      throw new Error("Failed to create cognitive object.");
    }

    return toCognitiveObject(record);
  }

  async listByTenant(tenantId: string, options?: ListByTenantOptions): Promise<CognitiveObject[]> {
    const { limit, offset } = clampListOptions(options);
    const records = await this.db
      .select()
      .from(cognitiveObjects)
      .where(eq(cognitiveObjects.tenantId, tenantId))
      .orderBy(desc(cognitiveObjects.createdAt))
      .limit(limit)
      .offset(offset);

    return records.map(toCognitiveObject);
  }

  async findByIdForTenant(id: string, tenantId: string): Promise<CognitiveObject | null> {
    const [record] = await this.db
      .select()
      .from(cognitiveObjects)
      .where(and(eq(cognitiveObjects.id, id), eq(cognitiveObjects.tenantId, tenantId)))
      .limit(1);

    return record ? toCognitiveObject(record) : null;
  }

  async findSemanticNeighbors(objectId: string, tenantId: string, limit: number): Promise<SemanticNeighbor[]> {
    const [source] = await this.db
      .select({ embedding: cognitiveObjects.embedding })
      .from(cognitiveObjects)
      .where(and(eq(cognitiveObjects.id, objectId), eq(cognitiveObjects.tenantId, tenantId)))
      .limit(1);

    if (!source?.embedding) {
      return [];
    }

    const queryVector = toVectorLiteral(source.embedding);
    const distance = sql<number>`${cognitiveObjects.embedding} <=> ${queryVector}::vector`;

    const records = await this.db
      .select({ id: cognitiveObjects.id, distance })
      .from(cognitiveObjects)
      .where(
        and(
          eq(cognitiveObjects.tenantId, tenantId),
          ne(cognitiveObjects.id, objectId),
          sql`${cognitiveObjects.embedding} IS NOT NULL`,
        ),
      )
      .orderBy(distance)
      .limit(limit);

    return records.map((record) => ({ objectId: record.id, similarity: 1 - record.distance }));
  }
}
