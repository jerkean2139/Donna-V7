import { vi } from "vitest";

const authMock = vi.fn<() => Promise<{ userId: string | null; orgId: string | null }>>();

vi.mock("@clerk/nextjs/server", () => ({
  // has() drives Clerk Billing plan resolution; false => free "starter" tier.
  auth: async () => ({ ...(await authMock()), has: () => false }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { captureIdeaAction } from "../src/app/dashboard/ideas-actions";
import { cognitiveObjectRepository, evolutionLoopRunRepository } from "../src/lib/repositories";
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

async function expectRedirect(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("REDIRECT:")) return message.slice("REDIRECT:".length);
    throw error;
  }
  throw new Error("expected a redirect");
}

describe("captureIdeaAction", () => {
  it("captures an idea as a Cognitive Object and redirects to it", async () => {
    const tenantId = `org_idea_${crypto.randomUUID()}`;
    signIn(tenantId);

    const url = await expectRedirect(
      captureIdeaAction(idleFormState, formData({ idea: "Ship the referral program by Q3", analyze: "false" })),
    );

    const objects = await cognitiveObjectRepository.listByTenant(tenantId);
    expect(objects).toHaveLength(1);
    expect(objects[0]?.title).toBe("Ship the referral program by Q3");
    expect(objects[0]?.objectType).toBe("issue");
    expect(objects[0]?.tags).toContain("ideas-lab");
    expect(url).toBe(`/cognitive-objects/${objects[0]?.id}`);
  });

  it("derives a title from the first line and keeps the full idea as the body", async () => {
    const tenantId = `org_idea_${crypto.randomUUID()}`;
    signIn(tenantId);

    await expectRedirect(
      captureIdeaAction(idleFormState, formData({ idea: "Fix onboarding\nUsers drop off at step 3", analyze: "false" })),
    );

    const [object] = await cognitiveObjectRepository.listByTenant(tenantId);
    expect(object?.title).toBe("Fix onboarding");
    expect(object?.body).toBe("Fix onboarding\nUsers drop off at step 3");
  });

  it("runs the Evolution Loop when analyze is true", async () => {
    const tenantId = `org_idea_${crypto.randomUUID()}`;
    signIn(tenantId);

    await expectRedirect(
      captureIdeaAction(idleFormState, formData({ idea: "Decide whether to raise prices", analyze: "true" })),
    );

    const [object] = await cognitiveObjectRepository.listByTenant(tenantId);
    const runs = await evolutionLoopRunRepository.listByObjectForTenant(object!.id, tenantId);
    expect(runs.length).toBeGreaterThan(0);
  });

  it("rejects an empty idea with a field error and creates nothing", async () => {
    const tenantId = `org_idea_${crypto.randomUUID()}`;
    signIn(tenantId);

    const result = await captureIdeaAction(idleFormState, formData({ idea: "", analyze: "false" }));
    expect(result.status).toBe("error");
    expect(await cognitiveObjectRepository.listByTenant(tenantId)).toHaveLength(0);
  });
});
