import { decryptSecret, encryptSecret } from "../../security/encryption";
import type { CredentialRepository } from "./repository";
import type { IntegrationProvider } from "./types";

export interface SetCredentialInput {
  tenantId: string;
  provider: IntegrationProvider;
  secret: string;
  userId: string;
}

// The only two places plaintext secrets exist: here (briefly, in memory,
// during encrypt/decrypt) and wherever the caller uses the decrypted value
// for one outbound API call. Nothing persists plaintext; nothing logs it.
export async function setCredential(repository: CredentialRepository, input: SetCredentialInput): Promise<void> {
  const encryptedValue = encryptSecret(input.secret);
  await repository.upsert({
    tenantId: input.tenantId,
    provider: input.provider,
    encryptedValue,
    createdByUserId: input.userId,
  });
}

// Returns null when no credential is configured OR when ENCRYPTION_KEY
// can't decrypt what's stored -- callers must treat both as "not
// available" and degrade gracefully (see FakeSendEmailExecutor's real
// counterpart), never throw a tenant-facing error for a config gap.
export async function getDecryptedCredential(
  repository: CredentialRepository,
  tenantId: string,
  provider: IntegrationProvider,
): Promise<string | null> {
  const record = await repository.findForTenant(tenantId, provider);
  if (!record) return null;

  try {
    return decryptSecret(record.encryptedValue);
  } catch {
    return null;
  }
}

export async function hasCredential(
  repository: CredentialRepository,
  tenantId: string,
  provider: IntegrationProvider,
): Promise<boolean> {
  return (await repository.findForTenant(tenantId, provider)) !== null;
}

export async function deleteCredential(
  repository: CredentialRepository,
  tenantId: string,
  provider: IntegrationProvider,
): Promise<void> {
  await repository.deleteForTenant(tenantId, provider);
}
