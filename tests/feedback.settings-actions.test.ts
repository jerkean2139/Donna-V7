import { vi } from "vitest";

const authMock = vi.fn<() => Promise<{ userId: string | null; orgId: string | null }>>();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { mintWidgetKeyAction, revokeWidgetKeyAction } from "../src/app/settings/feedback/actions";
import { feedbackWidgetKeyRepository } from "../src/lib/repositories";
import { listWidgetKeys } from "../src/lib/feedback/service";
import { idleFormState } from "../src/lib/forms";

function signIn(tenantId: string, userId = "user_1"): void {
  authMock.mockResolvedValue({ userId, orgId: tenantId });
}

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("mintWidgetKeyAction", () => {
  it("mints a key with a parsed origin allowlist", async () => {
    const tenantId = `org_fbs_${crypto.randomUUID()}`;
    signIn(tenantId);

    const result = await mintWidgetKeyAction(
      idleFormState,
      formData({ label: "Site", allowedOrigins: "https://a.com\nhttps://b.com" }),
    );
    expect(result.status).toBe("idle");

    const keys = await listWidgetKeys(feedbackWidgetKeyRepository, tenantId);
    expect(keys).toHaveLength(1);
    expect(keys[0]?.allowedOrigins).toEqual(["https://a.com", "https://b.com"]);
  });

  it("rejects an invalid origin (with a path) as a field error", async () => {
    const tenantId = `org_fbs_${crypto.randomUUID()}`;
    signIn(tenantId);

    const result = await mintWidgetKeyAction(
      idleFormState,
      formData({ label: "Site", allowedOrigins: "https://a.com/path" }),
    );
    expect(result.status).toBe("error");
    expect(await listWidgetKeys(feedbackWidgetKeyRepository, tenantId)).toHaveLength(0);
  });

  it("rejects a missing label", async () => {
    signIn(`org_fbs_${crypto.randomUUID()}`);
    const result = await mintWidgetKeyAction(idleFormState, formData({ label: "" }));
    expect(result.status).toBe("error");
  });
});

describe("revokeWidgetKeyAction", () => {
  it("revokes a key for the active tenant", async () => {
    const tenantId = `org_fbs_${crypto.randomUUID()}`;
    signIn(tenantId);
    await mintWidgetKeyAction(idleFormState, formData({ label: "Site" }));
    const [key] = await listWidgetKeys(feedbackWidgetKeyRepository, tenantId);

    await revokeWidgetKeyAction(formData({ keyId: key!.id }));

    const [after] = await listWidgetKeys(feedbackWidgetKeyRepository, tenantId);
    expect(after?.revokedAt).not.toBeNull();
  });
});
