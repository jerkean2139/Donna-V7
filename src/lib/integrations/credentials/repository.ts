import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { tenantIntegrationCredentials } from "../../../db/schema";
import type * as dbSchema from "../../../db/schema";
import type {
  IntegrationProvider,
  TenantIntegrationCredential,
  UpsertCredentialRepositoryInput,
} from "./types";

export interface CredentialRepository {
  upsert(input: UpsertCredentialRepositoryInput): Promise<TenantIntegrationCredential>;
  findForTenant(tenantId: string, provider: IntegrationProvider): Promise<TenantIntegrationCredential | null>;
  deleteForTenant(tenantId: string, provider: IntegrationProvider): Promise<void>;
}

export class InMemoryCredentialRepository implements CredentialRepository {
  private readonly store = new Map<string, TenantIntegrationCredential>();

  private key(tenantId: string, provider: IntegrationProvider): string {
    return `${tenantId}:${provider}`;
  }

  async upsert(input: UpsertCredentialRepositoryInput): Promise<TenantIntegrationCredential> {
    const key = this.key(input.tenantId, input.provider);
    const existing = this.store.get(key);
    const record: TenantIntegrationCredential = {
      id: existing?.id ?? crypto.randomUUID(),
      tenantId: input.tenantId,
      provider: input.provider,
      encryptedValue: input.encryptedValue,
      createdByUserId: existing?.createdByUserId ?? input.createdByUserId,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.store.set(key, record);
    return record;
  }

  async findForTenant(
    tenantId: string,
    provider: IntegrationProvider,
  ): Promise<TenantIntegrationCredential | null> {
    return this.store.get(this.key(tenantId, provider)) ?? null;
  }

  async deleteForTenant(tenantId: string, provider: IntegrationProvider): Promise<void> {
    this.store.delete(this.key(tenantId, provider));
  }
}

type CredentialRecord = typeof tenantIntegrationCredentials.$inferSelect;

function toCredential(record: CredentialRecord): TenantIntegrationCredential {
  return {
    id: record.id,
    tenantId: record.tenantId,
    provider: record.provider,
    encryptedValue: record.encryptedValue,
    createdByUserId: record.createdByUserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class DrizzleCredentialRepository implements CredentialRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof dbSchema>) {}

  async upsert(input: UpsertCredentialRepositoryInput): Promise<TenantIntegrationCredential> {
    const [record] = await this.db
      .insert(tenantIntegrationCredentials)
      .values({
        tenantId: input.tenantId,
        provider: input.provider,
        encryptedValue: input.encryptedValue,
        createdByUserId: input.createdByUserId,
      })
      .onConflictDoUpdate({
        target: [tenantIntegrationCredentials.tenantId, tenantIntegrationCredentials.provider],
        set: {
          encryptedValue: input.encryptedValue,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!record) {
      throw new Error("Failed to upsert integration credential.");
    }
    return toCredential(record);
  }

  async findForTenant(
    tenantId: string,
    provider: IntegrationProvider,
  ): Promise<TenantIntegrationCredential | null> {
    const [record] = await this.db
      .select()
      .from(tenantIntegrationCredentials)
      .where(
        and(
          eq(tenantIntegrationCredentials.tenantId, tenantId),
          eq(tenantIntegrationCredentials.provider, provider),
        ),
      )
      .limit(1);
    return record ? toCredential(record) : null;
  }

  async deleteForTenant(tenantId: string, provider: IntegrationProvider): Promise<void> {
    await this.db
      .delete(tenantIntegrationCredentials)
      .where(
        and(
          eq(tenantIntegrationCredentials.tenantId, tenantId),
          eq(tenantIntegrationCredentials.provider, provider),
        ),
      );
  }
}
