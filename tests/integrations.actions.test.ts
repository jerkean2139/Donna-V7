import { vi } from "vitest";

const authMock = vi.fn<() => Promise<{ userId: string | null; orgId: string | null }>>();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  deleteIntegrationCredentialAction,
  getIntegrationCredentialStatuses,
  setIntegrationCredentialAction,
} from "../src/app/integrations/actions";

function signIn(tenantId: string, userId = "user_1"): void {
  authMock.mockResolvedValue({ userId, orgId: tenantId });
}

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("integration credential actions", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", "unit-test-encryption-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports every provider as not configured for a fresh tenant", async () => {
    signIn(`org_int_${crypto.randomUUID()}`);
    const statuses = await getIntegrationCredentialStatuses();
    expect(statuses).toEqual([
      { provider: "ghl", configured: false },
      { provider: "resend", configured: false },
    ]);
  });

  it("sets a credential and reflects it as configured", async () => {
    const tenantId = `org_int_${crypto.randomUUID()}`;
    signIn(tenantId);

    await setIntegrationCredentialAction(formData({ provider: "ghl", secret: "ghl_key_123" }));

    const statuses = await getIntegrationCredentialStatuses();
    expect(statuses.find((s) => s.provider === "ghl")?.configured).toBe(true);
    expect(statuses.find((s) => s.provider === "resend")?.configured).toBe(false);
  });

  it("deletes a credential", async () => {
    const tenantId = `org_int_${crypto.randomUUID()}`;
    signIn(tenantId);

    await setIntegrationCredentialAction(formData({ provider: "resend", secret: "re_key_123" }));
    await deleteIntegrationCredentialAction(formData({ provider: "resend" }));

    const statuses = await getIntegrationCredentialStatuses();
    expect(statuses.find((s) => s.provider === "resend")?.configured).toBe(false);
  });

  it("isolates credentials by tenant", async () => {
    const tenantA = `org_int_${crypto.randomUUID()}`;
    const tenantB = `org_int_${crypto.randomUUID()}`;

    signIn(tenantA);
    await setIntegrationCredentialAction(formData({ provider: "ghl", secret: "a-key" }));

    signIn(tenantB);
    const statuses = await getIntegrationCredentialStatuses();
    expect(statuses.find((s) => s.provider === "ghl")?.configured).toBe(false);
  });

  it("rejects an unknown provider", async () => {
    signIn(`org_int_${crypto.randomUUID()}`);
    await expect(
      setIntegrationCredentialAction(formData({ provider: "not-a-real-provider", secret: "x" })),
    ).rejects.toThrow();
  });

  it("rejects an empty secret", async () => {
    signIn(`org_int_${crypto.randomUUID()}`);
    await expect(setIntegrationCredentialAction(formData({ provider: "ghl", secret: "" }))).rejects.toThrow();
  });
});
