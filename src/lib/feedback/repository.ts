import { and, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { feedbackWidgetKeys } from "../../db/schema";
import type * as dbSchema from "../../db/schema";
import type { CreateWidgetKeyRepositoryInput, FeedbackWidgetKey } from "./types";

export interface FeedbackWidgetKeyRepository {
  create(input: CreateWidgetKeyRepositoryInput): Promise<FeedbackWidgetKey>;
  listByTenant(tenantId: string): Promise<FeedbackWidgetKey[]>;
  // Resolves a key for ingest: only non-revoked keys, looked up by the public
  // key alone (the tenant is derived from the key, since the caller is an
  // unauthenticated cross-origin widget).
  findActiveByPublicKey(publicKey: string): Promise<FeedbackWidgetKey | null>;
  revokeForTenant(id: string, tenantId: string): Promise<void>;
}

export class InMemoryFeedbackWidgetKeyRepository implements FeedbackWidgetKeyRepository {
  private readonly store = new Map<string, FeedbackWidgetKey>();

  async create(input: CreateWidgetKeyRepositoryInput): Promise<FeedbackWidgetKey> {
    const key: FeedbackWidgetKey = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      publicKey: input.publicKey,
      label: input.label,
      allowedOrigins: input.allowedOrigins,
      createdByUserId: input.createdByUserId,
      createdAt: new Date(),
      revokedAt: null,
    };
    this.store.set(key.id, key);
    return key;
  }

  async listByTenant(tenantId: string): Promise<FeedbackWidgetKey[]> {
    return Array.from(this.store.values())
      .filter((key) => key.tenantId === tenantId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async findActiveByPublicKey(publicKey: string): Promise<FeedbackWidgetKey | null> {
    return (
      Array.from(this.store.values()).find(
        (key) => key.publicKey === publicKey && key.revokedAt === null,
      ) ?? null
    );
  }

  async revokeForTenant(id: string, tenantId: string): Promise<void> {
    const key = this.store.get(id);
    if (!key || key.tenantId !== tenantId || key.revokedAt !== null) return;
    this.store.set(id, { ...key, revokedAt: new Date() });
  }
}

type FeedbackWidgetKeyRecord = typeof feedbackWidgetKeys.$inferSelect;

function toWidgetKey(record: FeedbackWidgetKeyRecord): FeedbackWidgetKey {
  return {
    id: record.id,
    tenantId: record.tenantId,
    publicKey: record.publicKey,
    label: record.label,
    allowedOrigins: record.allowedOrigins,
    createdByUserId: record.createdByUserId,
    createdAt: record.createdAt,
    revokedAt: record.revokedAt,
  };
}

export class DrizzleFeedbackWidgetKeyRepository implements FeedbackWidgetKeyRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof dbSchema>) {}

  async create(input: CreateWidgetKeyRepositoryInput): Promise<FeedbackWidgetKey> {
    const [record] = await this.db
      .insert(feedbackWidgetKeys)
      .values({
        tenantId: input.tenantId,
        publicKey: input.publicKey,
        label: input.label,
        allowedOrigins: input.allowedOrigins,
        createdByUserId: input.createdByUserId,
      })
      .returning();
    if (!record) {
      throw new Error("Failed to create feedback widget key.");
    }
    return toWidgetKey(record);
  }

  async listByTenant(tenantId: string): Promise<FeedbackWidgetKey[]> {
    const records = await this.db
      .select()
      .from(feedbackWidgetKeys)
      .where(eq(feedbackWidgetKeys.tenantId, tenantId))
      .orderBy(desc(feedbackWidgetKeys.createdAt));
    return records.map(toWidgetKey);
  }

  async findActiveByPublicKey(publicKey: string): Promise<FeedbackWidgetKey | null> {
    const [record] = await this.db
      .select()
      .from(feedbackWidgetKeys)
      .where(and(eq(feedbackWidgetKeys.publicKey, publicKey), isNull(feedbackWidgetKeys.revokedAt)))
      .limit(1);
    return record ? toWidgetKey(record) : null;
  }

  async revokeForTenant(id: string, tenantId: string): Promise<void> {
    await this.db
      .update(feedbackWidgetKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(feedbackWidgetKeys.id, id),
          eq(feedbackWidgetKeys.tenantId, tenantId),
          isNull(feedbackWidgetKeys.revokedAt),
        ),
      );
  }
}
