import { FakeAgentEngine } from "../src/lib/agents/fake-engine";

describe("FakeAgentEngine", () => {
  const engine = new FakeAgentEngine();

  it("produces only read tool calls and no proposed actions for a read-only agent", async () => {
    const output = await engine.runAgentTask({
      agentName: "Deep Research",
      task: "research the market",
      tenantId: "tenant_a",
      objectId: "obj_1",
      objectRiskLevel: "low",
      objectConfidenceScore: null,
    });

    expect(output.proposedActions).toHaveLength(0);
    expect(output.toolCalls.every((call) => call.kind === "read")).toBe(true);
    expect(output.toolCalls.map((c) => c.toolName).sort()).toEqual(["web_fetch", "web_search"]);
  });

  it("produces a proposed action, never a real send, for an act-only agent", async () => {
    const output = await engine.runAgentTask({
      agentName: "Customer Service",
      task: "respond to a complaint",
      tenantId: "tenant_a",
      objectId: "obj_1",
      objectRiskLevel: "low",
      objectConfidenceScore: null,
    });

    expect(output.proposedActions).toHaveLength(1);
    expect(output.proposedActions[0]?.toolName).toBe("send_email");
    expect(output.toolCalls[0]?.kind).toBe("act");
  });

  it("never emits a delegation request", async () => {
    const output = await engine.runAgentTask({
      agentName: "Programming",
      task: "build a feature",
      tenantId: "tenant_a",
      objectId: "obj_1",
      objectRiskLevel: "low",
      objectConfidenceScore: null,
    });
    expect(output.delegationRequest).toBeNull();
  });

  it("throws for an unknown agent name", async () => {
    await expect(
      engine.runAgentTask({
        agentName: "Nonexistent Agent",
        task: "x",
        tenantId: "tenant_a",
        objectId: "obj_1",
        objectRiskLevel: "low",
        objectConfidenceScore: null,
      }),
    ).rejects.toThrow(/Unknown agent/);
  });

  it("is deterministic across repeated calls with the same input", async () => {
    const input = {
      agentName: "Bookkeeping",
      task: "log this expense",
      tenantId: "tenant_a",
      objectId: "obj_1",
      objectRiskLevel: "low" as const,
      objectConfidenceScore: null,
    };
    const first = await engine.runAgentTask(input);
    const second = await engine.runAgentTask(input);
    expect(second).toEqual(first);
  });
});
