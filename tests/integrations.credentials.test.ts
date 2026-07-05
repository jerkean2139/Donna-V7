import { InMemoryCredentialRepository } from "../src/lib/integrations/credentials/repository";
import {
  deleteCredential,
  getDecryptedCredential,
  hasCredential,
  setCredential,
} from "../src/lib/integrations/credentials/service";

describe("credential service (InMemoryCredentialRepository)", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", "unit-test-encryption-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stores a secret encrypted and returns it decrypted", async () => {
    const repository = new InMemoryCredentialRepository();
    await setCredential(repository, { tenantId: "tenant_a", provider: "resend", secret: "re_123", userId: "user_1" });

    const record = await repository.findForTenant("tenant_a", "resend");
    expect(record?.encryptedValue).not.toBe("re_123");

    const decrypted = await getDecryptedCredential(repository, "tenant_a", "resend");
    expect(decrypted).toBe("re_123");
  });

  it("returns null for a tenant/provider with no credential", async () => {
    const repository = new InMemoryCredentialRepository();
    expect(await getDecryptedCredential(repository, "tenant_a", "ghl")).toBeNull();
    expect(await hasCredential(repository, "tenant_a", "ghl")).toBe(false);
  });

  it("returns null (never throws) when the stored value can't be decrypted", async () => {
    const repository = new InMemoryCredentialRepository();
    await setCredential(repository, { tenantId: "tenant_a", provider: "ghl", secret: "key_1", userId: "user_1" });

    vi.stubEnv("ENCRYPTION_KEY", "a-different-key-now");
    expect(await getDecryptedCredential(repository, "tenant_a", "ghl")).toBeNull();
  });

  it("upsert replaces the previous credential for the same tenant+provider", async () => {
    const repository = new InMemoryCredentialRepository();
    await setCredential(repository, { tenantId: "tenant_a", provider: "ghl", secret: "old", userId: "user_1" });
    await setCredential(repository, { tenantId: "tenant_a", provider: "ghl", secret: "new", userId: "user_1" });

    expect(await getDecryptedCredential(repository, "tenant_a", "ghl")).toBe("new");
  });

  it("isolates credentials by tenant", async () => {
    const repository = new InMemoryCredentialRepository();
    await setCredential(repository, { tenantId: "tenant_a", provider: "ghl", secret: "a-key", userId: "user_1" });

    expect(await hasCredential(repository, "tenant_b", "ghl")).toBe(false);
  });

  it("deletes a credential", async () => {
    const repository = new InMemoryCredentialRepository();
    await setCredential(repository, { tenantId: "tenant_a", provider: "ghl", secret: "a-key", userId: "user_1" });
    await deleteCredential(repository, "tenant_a", "ghl");

    expect(await hasCredential(repository, "tenant_a", "ghl")).toBe(false);
  });
});
