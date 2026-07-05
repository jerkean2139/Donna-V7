import { InMemoryAgentRunRepository } from "../src/lib/agents/agent-run/repository";

async function seed(repo: InMemoryAgentRunRepository, tenantId: string, agentName: string, status: "completed" | "failed") {
  await repo.create({ tenantId, objectId: "obj_1", agentName, task: "t", status });
}

describe("AgentRunRepository.aggregateByAgentForTenant", () => {
  it("groups all-time run counts per agent with completed/failed splits", async () => {
    const repo = new InMemoryAgentRunRepository();
    await seed(repo, "tenant_a", "Programming", "completed");
    await seed(repo, "tenant_a", "Programming", "completed");
    await seed(repo, "tenant_a", "Programming", "failed");
    await seed(repo, "tenant_a", "Bookkeeping", "completed");

    const aggregates = await repo.aggregateByAgentForTenant("tenant_a");
    const programming = aggregates.find((a) => a.agentName === "Programming")!;
    const bookkeeping = aggregates.find((a) => a.agentName === "Bookkeeping")!;

    expect(programming).toEqual({
      agentName: "Programming",
      totalRuns: 3,
      completedRuns: 2,
      failedRuns: 1,
    });
    expect(bookkeeping.totalRuns).toBe(1);
  });

  it("does not count another tenant's runs", async () => {
    const repo = new InMemoryAgentRunRepository();
    await seed(repo, "tenant_a", "Programming", "completed");
    await seed(repo, "tenant_b", "Programming", "completed");

    const aggregates = await repo.aggregateByAgentForTenant("tenant_a");
    expect(aggregates.find((a) => a.agentName === "Programming")!.totalRuns).toBe(1);
  });

  it("returns an empty array for a tenant with no runs", async () => {
    const repo = new InMemoryAgentRunRepository();
    expect(await repo.aggregateByAgentForTenant("tenant_a")).toEqual([]);
  });
});
