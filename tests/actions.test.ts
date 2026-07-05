import { vi } from "vitest";

// The actions resolve the Clerk session via getTenantContext and finish with a
// framework redirect. Both are mocked: auth() is controlled per test, and
// redirect()/notFound() throw sentinels the way Next.js does at runtime.
const authMock = vi.fn<() => Promise<{ userId: string | null; orgId: string | null }>>();

vi.mock("@clerk/nextjs/server", () => ({
  // has() drives Clerk Billing plan resolution; false => free "starter" tier.
  auth: async () => ({ ...(await authMock()), has: () => false }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createCognitiveObjectAction,
  startEvolutionLoopAction,
} from "../src/app/cognitive-objects/actions";
import { createRelationshipAction } from "../src/app/cognitive-objects/[id]/relationships/actions";
import { cognitiveObjectRepository, evolutionLoopRunRepository } from "../src/lib/repositories";
import { idleFormState } from "../src/lib/forms";

function signIn(tenantId: string, userId = "user_1"): void {
  authMock.mockResolvedValue({ userId, orgId: tenantId });
}

function signOut(): void {
  authMock.mockResolvedValue({ userId: null, orgId: null });
}

function objectFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("objectType", "decision");
  formData.set("title", "Ship the Q3 pricing change");
  formData.set("summary", "Raise the base plan price.");
  formData.set("source", "manual");
  formData.set("riskLevel", "low");
  formData.set("tags", "pricing, q3");
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createCognitiveObjectAction", () => {
  it("creates the object and redirects to its detail page", async () => {
    const tenantId = `org_create_${crypto.randomUUID()}`;
    signIn(tenantId);

    await expect(createCognitiveObjectAction(idleFormState, objectFormData())).rejects.toThrow(
      /^REDIRECT:\/cognitive-objects\//,
    );

    const objects = await cognitiveObjectRepository.listByTenant(tenantId);
    expect(objects).toHaveLength(1);
    expect(objects[0]?.title).toBe("Ship the Q3 pricing change");
    expect(objects[0]?.tags).toEqual(["pricing", "q3"]);
  });

  it("returns field errors instead of saving when input is invalid", async () => {
    const tenantId = `org_invalid_${crypto.randomUUID()}`;
    signIn(tenantId);

    const state = await createCognitiveObjectAction(
      idleFormState,
      objectFormData({ title: "no" }),
    );

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.fieldErrors?.title).toBeDefined();
    }
    expect(await cognitiveObjectRepository.listByTenant(tenantId)).toHaveLength(0);
  });

  it("rejects unauthenticated calls", async () => {
    signOut();

    await expect(createCognitiveObjectAction(idleFormState, objectFormData())).rejects.toThrow(
      "Authentication required.",
    );
  });
});

describe("startEvolutionLoopAction", () => {
  it("creates a loop run for a tenant object and redirects", async () => {
    const tenantId = `org_loop_${crypto.randomUUID()}`;
    signIn(tenantId);

    const object = await cognitiveObjectRepository.create({
      tenantId,
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Loop target",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const formData = new FormData();
    formData.set("objectId", object.id);

    await expect(startEvolutionLoopAction(formData)).rejects.toThrow(
      `REDIRECT:/cognitive-objects/${object.id}`,
    );

    const runs = await evolutionLoopRunRepository.listByObjectForTenant(object.id, tenantId);
    expect(runs).toHaveLength(1);
  });

  it("refuses to start a loop on another tenant's object", async () => {
    const victimTenant = `org_victim_${crypto.randomUUID()}`;
    const attackerTenant = `org_attacker_${crypto.randomUUID()}`;

    const foreign = await cognitiveObjectRepository.create({
      tenantId: victimTenant,
      createdByUserId: "user_2",
      objectType: "decision",
      title: "Foreign object",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    signIn(attackerTenant);
    const formData = new FormData();
    formData.set("objectId", foreign.id);

    await expect(startEvolutionLoopAction(formData)).rejects.toThrow(
      "Cognitive Object not found for active tenant.",
    );
    expect(await evolutionLoopRunRepository.listByObjectForTenant(foreign.id, victimTenant)).toHaveLength(0);
  });

  it("rejects a malformed object id before touching the repository", async () => {
    signIn(`org_malformed_${crypto.randomUUID()}`);
    const formData = new FormData();
    formData.set("objectId", "not-a-uuid");

    await expect(startEvolutionLoopAction(formData)).rejects.toThrow();
  });
});

describe("createRelationshipAction", () => {
  async function seedPair(tenantId: string) {
    const from = await cognitiveObjectRepository.create({
      tenantId,
      createdByUserId: "user_1",
      objectType: "decision",
      title: "From object",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });
    const to = await cognitiveObjectRepository.create({
      tenantId,
      createdByUserId: "user_1",
      objectType: "research",
      title: "To object",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });
    return { from, to };
  }

  function relationshipFormData(fromObjectId: string, toObjectId: string): FormData {
    const formData = new FormData();
    formData.set("fromObjectId", fromObjectId);
    formData.set("toObjectId", toObjectId);
    formData.set("relationshipType", "supports");
    formData.set("strength", "75");
    formData.set("evidenceSummary", "Linked during planning.");
    return formData;
  }

  it("creates the relationship and redirects back to the source object", async () => {
    const tenantId = `org_edge_${crypto.randomUUID()}`;
    signIn(tenantId);
    const { from, to } = await seedPair(tenantId);

    await expect(
      createRelationshipAction(idleFormState, relationshipFormData(from.id, to.id)),
    ).rejects.toThrow(`REDIRECT:/cognitive-objects/${from.id}`);
  });

  it("returns a field error for a malformed target id", async () => {
    const tenantId = `org_badid_${crypto.randomUUID()}`;
    signIn(tenantId);
    const { from } = await seedPair(tenantId);

    const state = await createRelationshipAction(
      idleFormState,
      relationshipFormData(from.id, "not-a-uuid"),
    );

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.fieldErrors?.toObjectId).toBeDefined();
    }
  });

  it("surfaces the domain error when the target belongs to another tenant", async () => {
    const tenantId = `org_cross_${crypto.randomUUID()}`;
    const otherTenant = `org_other_${crypto.randomUUID()}`;
    signIn(tenantId);
    const { from } = await seedPair(tenantId);
    const { to: foreign } = await seedPair(otherTenant);

    const state = await createRelationshipAction(
      idleFormState,
      relationshipFormData(from.id, foreign.id),
    );

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.message).toBe("Both Cognitive Objects must exist in the active tenant.");
    }
  });

  it("rejects unauthenticated calls", async () => {
    signOut();

    const state = createRelationshipAction(
      idleFormState,
      relationshipFormData(crypto.randomUUID(), crypto.randomUUID()),
    );

    await expect(state).rejects.toThrow("Authentication required.");
  });
});
