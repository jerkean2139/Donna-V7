import { InMemoryAgentRunRepository } from "../src/lib/agents/agent-run/repository";
import { InMemoryEvolutionLoopRunRepository } from "../src/lib/evolution-loop/repository";

describe("countForTenantSince", () => {
  it("counts a tenant's agent runs created since a boundary", async () => {
    const repo = new InMemoryAgentRunRepository();
    await repo.create({ tenantId: "tenant_a", objectId: "o", agentName: "X", task: "t", status: "completed" });
    await repo.create({ tenantId: "tenant_a", objectId: "o", agentName: "Y", task: "t", status: "completed" });
    await repo.create({ tenantId: "tenant_b", objectId: "o", agentName: "Z", task: "t", status: "completed" });

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(await repo.countForTenantSince("tenant_a", monthAgo)).toBe(2);
    expect(await repo.countForTenantSince("tenant_b", monthAgo)).toBe(1);
  });

  it("excludes runs older than the boundary", async () => {
    const repo = new InMemoryAgentRunRepository();
    await repo.create({ tenantId: "tenant_a", objectId: "o", agentName: "X", task: "t", status: "completed" });
    const future = new Date(Date.now() + 60 * 1000);
    expect(await repo.countForTenantSince("tenant_a", future)).toBe(0);
  });

  it("counts loop runs the same way", async () => {
    const repo = new InMemoryEvolutionLoopRunRepository();
    await repo.create({ tenantId: "tenant_a", objectId: "o" });
    await repo.create({ tenantId: "tenant_a", objectId: "o" });
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(await repo.countForTenantSince("tenant_a", monthAgo)).toBe(2);
  });
});
