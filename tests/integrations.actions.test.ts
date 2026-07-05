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
import { idleFormState } from "../src/lib/forms";

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

    const result = await setIntegrationCredentialAction(
      idleFormState,
      formData({ provider: "ghl", secret: "ghl_key_123" }),
    );
    expect(result.status).toBe("idle");

    const statuses = await getIntegrationCredentialStatuses();
    expect(statuses.find((s) => s.provider === "ghl")?.configured).toBe(true);
    expect(statuses.find((s) => s.provider === "resend")?.configured).toBe(false);
  });

  it("deletes a credential", async () => {
    const tenantId = `org_int_${crypto.randomUUID()}`;
    signIn(tenantId);

    await setIntegrationCredentialAction(idleFormState, formData({ provider: "resend", secret: "re_key_123" }));
    await deleteIntegrationCredentialAction(formData({ provider: "resend" }));

    const statuses = await getIntegrationCredentialStatuses();
    expect(statuses.find((s) => s.provider === "resend")?.configured).toBe(false);
  });

  it("isolates credentials by tenant", async () => {
    const tenantA = `org_int_${crypto.randomUUID()}`;
    const tenantB = `org_int_${crypto.randomUUID()}`;

    signIn(tenantA);
    await setIntegrationCredentialAction(idleFormState, formData({ provider: "ghl", secret: "a-key" }));

    signIn(tenantB);
    const statuses = await getIntegrationCredentialStatuses();
    expect(statuses.find((s) => s.provider === "ghl")?.configured).toBe(false);
  });

  it("rejects an unknown provider with a field error instead of throwing", async () => {
    signIn(`org_int_${crypto.randomUUID()}`);
    const result = await setIntegrationCredentialAction(
      idleFormState,
      formData({ provider: "not-a-real-provider", secret: "x" }),
    );
    expect(result.status).toBe("error");
  });

  it("rejects an empty secret with a field error instead of throwing", async () => {
    signIn(`org_int_${crypto.randomUUID()}`);
    const result = await setIntegrationCredentialAction(
      idleFormState,
      formData({ provider: "ghl", secret: "" }),
    );
    expect(result.status).toBe("error");
  });
});
