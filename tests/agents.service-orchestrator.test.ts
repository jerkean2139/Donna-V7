import { InMemoryCognitiveGraphRepository } from "../src/lib/cognitive-graph/repository";
import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";
import { InMemoryAgentRunRepository } from "../src/lib/agents/agent-run/repository";
import { InMemoryProposedActionRepository } from "../src/lib/agents/proposed-action/repository";
import { MAX_DELEGATION_DEPTH, startAgentTask, type AgentServiceDeps } from "../src/lib/agents/service";
import type { AgentEngine, AgentRunInput, AgentRunOutput } from "../src/lib/agents/types";

class ScriptedAgentEngine implements AgentEngine {
  public callCount = 0;
  constructor(private readonly script: (input: AgentRunInput, callIndex: number) => AgentRunOutput) {}

  async runAgentTask(input: AgentRunInput): Promise<AgentRunOutput> {
    const output = this.script(input, this.callCount);
    this.callCount += 1;
    return output;
  }
}

function emptyOutput(): AgentRunOutput {
  return { responseText: "done", toolCalls: [], proposedActions: [], delegationRequest: null };
}

async function setupDeps(engine: AgentEngine): Promise<{ deps: AgentServiceDeps; objectId: string; tenantId: string }> {
  const objectRepository = new InMemoryCognitiveObjectRepository();
  const graphRepository = new InMemoryCognitiveGraphRepository();
  const agentRunRepository = new InMemoryAgentRunRepository();
  const proposedActionRepository = new InMemoryProposedActionRepository();
  const tenantId = "tenant_a";

  const object = await objectRepository.create({
    tenantId,
    createdByUserId: "user_1",
    objectType: "decision",
    title: "Target object",
    source: "manual",
    riskLevel: "low",
    tags: [],
  });

  return {
    deps: { objectRepository, graphRepository, agentRunRepository, proposedActionRepository, agentEngine: engine },
    objectId: object.id,
    tenantId,
  };
}

describe("startAgentTask", () => {
  it("routes via keyword when agentName is omitted", async () => {
    const engine = new ScriptedAgentEngine(() => emptyOutput());
    const { deps, objectId, tenantId } = await setupDeps(engine);

    const result = await startAgentTask(deps, { task: "log this expense receipt", tenantId, objectId });
    expect(result.run.agentName).toBe("Bookkeeping");
  });

  it("throws when no agent matches and none was given explicitly", async () => {
    const engine = new ScriptedAgentEngine(() => emptyOutput());
    const { deps, objectId, tenantId } = await setupDeps(engine);

    await expect(startAgentTask(deps, { task: "asdkjfh zzz", tenantId, objectId })).rejects.toThrow(
      /No agent matched/,
    );
  });

  it("throws for an explicit but unknown agent name", async () => {
    const engine = new ScriptedAgentEngine(() => emptyOutput());
    const { deps, objectId, tenantId } = await setupDeps(engine);

    await expect(
      startAgentTask(deps, { task: "x", tenantId, objectId, agentName: "Not A Real Agent" }),
    ).rejects.toThrow(/Unknown agent/);
  });

  it("throws when the object does not exist for the active tenant", async () => {
    const engine = new ScriptedAgentEngine(() => emptyOutput());
    const { deps, tenantId } = await setupDeps(engine);

    await expect(
      startAgentTask(deps, { task: "x", tenantId, objectId: crypto.randomUUID(), agentName: "Bookkeeping" }),
    ).rejects.toThrow(/not found/);
  });

  it("blocks cross-tenant object access", async () => {
    const engine = new ScriptedAgentEngine(() => emptyOutput());
    const { deps, objectId } = await setupDeps(engine);

    await expect(
      startAgentTask(deps, { task: "x", tenantId: "attacker_tenant", objectId, agentName: "Bookkeeping" }),
    ).rejects.toThrow(/not found/);
  });

  it("persists a completed run with the engine's output", async () => {
    const engine = new ScriptedAgentEngine(() => ({
      responseText: "All done.",
      toolCalls: [{ toolName: "web_search", kind: "read", args: {}, resultSummary: "results" }],
      proposedActions: [],
      delegationRequest: null,
    }));
    const { deps, objectId, tenantId } = await setupDeps(engine);

    const result = await startAgentTask(deps, { task: "x", tenantId, objectId, agentName: "Deep Research" });
    expect(result.run.status).toBe("completed");
    expect(result.run.responseText).toBe("All done.");
    expect(result.run.toolCalls).toHaveLength(1);
  });

  it("persists a failed run and rethrows when the engine throws", async () => {
    const engine = new ScriptedAgentEngine(() => {
      throw new Error("provider outage");
    });
    const { deps, objectId, tenantId } = await setupDeps(engine);

    await expect(
      startAgentTask(deps, { task: "x", tenantId, objectId, agentName: "Deep Research" }),
    ).rejects.toThrow("provider outage");

    const runs = await deps.agentRunRepository.listByObjectForTenant(objectId, tenantId);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("failed");
  });

  it("creates a governed proposed action from the engine's draft, using the object's real risk and confidence", async () => {
    const engine = new ScriptedAgentEngine(() => ({
      responseText: "Proposing an email.",
      toolCalls: [],
      proposedActions: [
        {
          toolName: "send_email",
          args: { to: "a@b.com", subject: "hi", body: "..." },
          description: "Send an email",
          riskLevel: "medium",
          reversible: false,
        },
      ],
      delegationRequest: null,
    }));
    const { deps, objectId, tenantId } = await setupDeps(engine);

    const result = await startAgentTask(deps, { task: "x", tenantId, objectId, agentName: "Customer Service" });
    expect(result.proposedActions).toHaveLength(1);
    // send_email is irreversible -- never auto-executes, regardless of
    // confidence (a freshly-created object has a null confidenceScore here,
    // which governance treats as zero -- an even stronger reason to require
    // approval, not a weaker one).
    expect(result.proposedActions[0]?.status).toBe("proposed");
    expect(result.proposedActions[0]?.approvalRequired).toBe(true);
  });

  describe("delegation", () => {
    it("stops delegating once MAX_DELEGATION_DEPTH is reached, never recursing unbounded", async () => {
      // Every call requests delegation back to Programming -- if depth
      // enforcement is broken, this recurses forever (or until a stack/
      // timeout failure) instead of stopping cleanly.
      const engine = new ScriptedAgentEngine(() => ({
        responseText: "delegating",
        toolCalls: [],
        proposedActions: [],
        delegationRequest: { agentName: "Programming", task: "keep going", reason: "test" },
      }));
      const { deps, objectId, tenantId } = await setupDeps(engine);

      const result = await startAgentTask(deps, { task: "x", tenantId, objectId, agentName: "Programming" });

      // depth 0, 1, 2 = 3 total calls/runs (MAX_DELEGATION_DEPTH = 2 means
      // depth can reach 2 but not recurse again from there).
      expect(engine.callCount).toBe(MAX_DELEGATION_DEPTH + 1);
      const runs = await deps.agentRunRepository.listByObjectForTenant(objectId, tenantId);
      expect(runs).toHaveLength(MAX_DELEGATION_DEPTH + 1);

      // Walk the returned chain to confirm it's exactly that deep and then stops.
      let node = result;
      let depth = 0;
      while (node.delegatedResult) {
        node = node.delegatedResult;
        depth += 1;
      }
      expect(depth).toBe(MAX_DELEGATION_DEPTH);
    });

    it("drops a delegation request to an unknown agent instead of throwing", async () => {
      const engine = new ScriptedAgentEngine(() => ({
        responseText: "delegating to a made-up agent",
        toolCalls: [],
        proposedActions: [],
        delegationRequest: { agentName: "Not A Real Agent", task: "x", reason: "test" },
      }));
      const { deps, objectId, tenantId } = await setupDeps(engine);

      const result = await startAgentTask(deps, { task: "x", tenantId, objectId, agentName: "Programming" });
      expect(result.delegatedResult).toBeNull();
      expect(engine.callCount).toBe(1);
    });

    it("delegated runs are tenant- and object-scoped exactly like the top-level run", async () => {
      const engine = new ScriptedAgentEngine((_input, callIndex) =>
        callIndex === 0
          ? {
              responseText: "delegating once",
              toolCalls: [],
              proposedActions: [],
              delegationRequest: { agentName: "Bookkeeping", task: "sub-task", reason: "test" },
            }
          : emptyOutput(),
      );
      const { deps, objectId, tenantId } = await setupDeps(engine);

      const result = await startAgentTask(deps, { task: "x", tenantId, objectId, agentName: "Programming" });
      expect(result.delegatedResult?.run.agentName).toBe("Bookkeeping");
      expect(result.delegatedResult?.run.tenantId).toBe(tenantId);
      expect(result.delegatedResult?.run.objectId).toBe(objectId);
    });
  });
});
