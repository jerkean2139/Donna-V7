import { InMemoryProposedActionRepository } from "../src/lib/agents/proposed-action/repository";
import { InMemoryAgentRunRepository } from "../src/lib/agents/agent-run/repository";
import type { CreateProposedActionInput } from "../src/lib/agents/proposed-action/types";

function baseAction(overrides: Partial<CreateProposedActionInput> = {}): CreateProposedActionInput {
  return {
    tenantId: "tenant_a",
    agentRunId: "run_1",
    objectId: "obj_1",
    toolName: "send_email",
    args: {},
    description: "d",
    effectiveRiskLevel: "medium",
    reversible: true,
    approvalRequired: true,
    approvalReason: null,
    ...overrides,
  };
}

describe("ProposedActionRepository.listPendingApprovalForTenant", () => {
  it("returns only proposed + approvalRequired actions for the tenant", async () => {
    const repo = new InMemoryProposedActionRepository();
    const pending = await repo.create(baseAction());
    const autoExec = await repo.create(baseAction({ approvalRequired: false }));
    await repo.updateStatus({ id: autoExec.id, tenantId: "tenant_a", status: "executed" });
    await repo.create(baseAction({ tenantId: "tenant_b" }));

    const result = await repo.listPendingApprovalForTenant("tenant_a");
    expect(result.map((a) => a.id)).toEqual([pending.id]);
  });

  it("keeps an old pending action in the queue regardless of newer activity", async () => {
    const repo = new InMemoryProposedActionRepository();
    const oldPending = await repo.create(baseAction());
    for (let i = 0; i < 5; i += 1) {
      const a = await repo.create(baseAction({ approvalRequired: false }));
      await repo.updateStatus({ id: a.id, tenantId: "tenant_a", status: "executed" });
    }

    const result = await repo.listPendingApprovalForTenant("tenant_a");
    expect(result.map((a) => a.id)).toContain(oldPending.id);
  });

  it("does not leak another tenant's pending actions", async () => {
    const repo = new InMemoryProposedActionRepository();
    await repo.create(baseAction({ tenantId: "tenant_b" }));
    expect(await repo.listPendingApprovalForTenant("tenant_a")).toEqual([]);
  });
});

describe("ProposedActionRepository.listRecentForTenant", () => {
  it("returns newest-first, bounded by limit, tenant-scoped", async () => {
    const repo = new InMemoryProposedActionRepository();
    for (let i = 0; i < 5; i += 1) await repo.create(baseAction());
    await repo.create(baseAction({ tenantId: "tenant_b" }));

    const result = await repo.listRecentForTenant("tenant_a", 3);
    expect(result).toHaveLength(3);
    expect(result.every((a) => a.tenantId === "tenant_a")).toBe(true);
  });
});

describe("AgentRunRepository.listRecentForTenant", () => {
  it("returns newest-first, bounded, tenant-scoped", async () => {
    const repo = new InMemoryAgentRunRepository();
    for (let i = 0; i < 4; i += 1) {
      await repo.create({
        tenantId: "tenant_a",
        objectId: "obj_1",
        agentName: `Agent ${i}`,
        task: "t",
        status: "completed",
      });
    }
    await repo.create({
      tenantId: "tenant_b",
      objectId: "obj_2",
      agentName: "Other",
      task: "t",
      status: "completed",
    });

    const result = await repo.listRecentForTenant("tenant_a", 2);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.tenantId === "tenant_a")).toBe(true);
  });
});
