import { vi } from "vitest";

const authMock = vi.fn<() => Promise<{ userId: string | null; orgId: string | null }>>();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
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
  approveProposedActionAction,
  rejectProposedActionAction,
  startAgentTaskAction,
} from "../src/app/agents/actions";
import { cognitiveObjectRepository, proposedActionRepository } from "../src/lib/repositories";

function signIn(tenantId: string, userId = "user_1"): void {
  authMock.mockResolvedValue({ userId, orgId: tenantId });
}

describe("startAgentTaskAction", () => {
  it("runs an agent task and redirects to the object", async () => {
    const tenantId = `org_agent_${crypto.randomUUID()}`;
    signIn(tenantId);

    const object = await cognitiveObjectRepository.create({
      tenantId,
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Object for agent task",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const formData = new FormData();
    formData.set("objectId", object.id);
    formData.set("agentName", "Bookkeeping");
    formData.set("task", "log this expense");

    await expect(startAgentTaskAction(formData)).rejects.toThrow(
      `REDIRECT:/cognitive-objects/${object.id}`,
    );
  });

  it("refuses to run an agent task against another tenant's object", async () => {
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
    formData.set("agentName", "Bookkeeping");
    formData.set("task", "do the thing");

    await expect(startAgentTaskAction(formData)).rejects.toThrow(/not found/);
  });

  it("rejects unauthenticated calls", async () => {
    authMock.mockResolvedValue({ userId: null, orgId: null });
    const formData = new FormData();
    formData.set("objectId", crypto.randomUUID());
    formData.set("agentName", "Bookkeeping");
    formData.set("task", "do the thing");

    await expect(startAgentTaskAction(formData)).rejects.toThrow("Authentication required.");
  });
});

describe("approveProposedActionAction / rejectProposedActionAction", () => {
  it("approves a pending proposed action and redirects", async () => {
    const tenantId = `org_approve_${crypto.randomUUID()}`;
    signIn(tenantId);

    const object = await cognitiveObjectRepository.create({
      tenantId,
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Object needing an emailed response",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const startFormData = new FormData();
    startFormData.set("objectId", object.id);
    startFormData.set("agentName", "Customer Service");
    startFormData.set("task", "respond to a complaint");
    await expect(startAgentTaskAction(startFormData)).rejects.toThrow(/^REDIRECT:/);

    const pending = await proposedActionRepository.listByObjectForTenant(object.id, tenantId);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe("proposed");

    const decideFormData = new FormData();
    decideFormData.set("proposedActionId", pending[0]!.id);
    decideFormData.set("objectId", object.id);
    await expect(approveProposedActionAction(decideFormData)).rejects.toThrow(/^REDIRECT:/);

    const [decided] = await proposedActionRepository.listByObjectForTenant(object.id, tenantId);
    expect(decided?.status).toBe("executed");
  });

  it("rejects a pending proposed action without executing it", async () => {
    const tenantId = `org_reject_${crypto.randomUUID()}`;
    signIn(tenantId);

    const object = await cognitiveObjectRepository.create({
      tenantId,
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Object needing an emailed response",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const startFormData = new FormData();
    startFormData.set("objectId", object.id);
    startFormData.set("agentName", "Customer Service");
    startFormData.set("task", "respond to a complaint");
    await expect(startAgentTaskAction(startFormData)).rejects.toThrow(/^REDIRECT:/);

    const [pending] = await proposedActionRepository.listByObjectForTenant(object.id, tenantId);

    const decideFormData = new FormData();
    decideFormData.set("proposedActionId", pending!.id);
    decideFormData.set("objectId", object.id);
    await expect(rejectProposedActionAction(decideFormData)).rejects.toThrow(/^REDIRECT:/);

    const [decided] = await proposedActionRepository.listByObjectForTenant(object.id, tenantId);
    expect(decided?.status).toBe("rejected");
  });
});
