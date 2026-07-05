import {
  computeDepartmentActivity,
  computeGovernanceActivity,
} from "../src/lib/dashboard/mission-control";
import type { ProposedAction } from "../src/lib/agents/proposed-action/types";
import type { AgentRun } from "../src/lib/agents/agent-run/types";
import type { AgentDefinition } from "../src/lib/agents/types";

function action(overrides: Partial<ProposedAction>): ProposedAction {
  return {
    id: crypto.randomUUID(),
    tenantId: "tenant_a",
    agentRunId: "run_1",
    objectId: "obj_1",
    toolName: "send_email",
    args: {},
    description: "test",
    effectiveRiskLevel: "medium",
    reversible: true,
    status: "proposed",
    approvalRequired: true,
    approvalReason: null,
    decidedByUserId: null,
    decidedAt: null,
    resultSummary: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function run(agentName: string): AgentRun {
  return {
    id: crypto.randomUUID(),
    tenantId: "tenant_a",
    objectId: "obj_1",
    agentName,
    task: "do a thing",
    status: "completed",
    responseText: null,
    toolCalls: [],
    delegationRequest: null,
    createdAt: new Date(),
  };
}

describe("computeGovernanceActivity", () => {
  it("splits executed actions into auto vs human by decidedByUserId", () => {
    const result = computeGovernanceActivity([
      action({ status: "executed", decidedByUserId: null }),
      action({ status: "executed", decidedByUserId: null }),
      action({ status: "executed", decidedByUserId: "user_1" }),
      action({ status: "rejected", decidedByUserId: "user_1" }),
      action({ status: "failed" }),
      action({ status: "proposed" }),
    ]);

    expect(result.autoExecuted).toBe(2);
    expect(result.humanApproved).toBe(1);
    expect(result.rejected).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.executedTotal).toBe(3);
    expect(result.windowSize).toBe(6);
  });

  it("returns all-zero counts for an empty window", () => {
    const result = computeGovernanceActivity([]);
    expect(result).toEqual({
      autoExecuted: 0,
      humanApproved: 0,
      rejected: 0,
      failed: 0,
      executedTotal: 0,
      windowSize: 0,
    });
  });
});

describe("computeDepartmentActivity", () => {
  const registry: Record<string, AgentDefinition> = {
    Alpha: { name: "Alpha", department: "Sales", supervisor: "S", skillPath: "a.md", routingKeywords: [], tools: [] },
    Beta: { name: "Beta", department: "Sales", supervisor: "S", skillPath: "b.md", routingKeywords: [], tools: [] },
    Gamma: { name: "Gamma", department: "Ops", supervisor: "O", skillPath: "c.md", routingKeywords: [], tools: [] },
  };

  it("counts agents per department from the registry", () => {
    const result = computeDepartmentActivity([], registry);
    const sales = result.find((d) => d.department === "Sales");
    const ops = result.find((d) => d.department === "Ops");
    expect(sales?.agentCount).toBe(2);
    expect(ops?.agentCount).toBe(1);
  });

  it("counts recent runs per department and sorts most-active first", () => {
    const result = computeDepartmentActivity([run("Alpha"), run("Beta"), run("Gamma")], registry);
    expect(result[0]?.department).toBe("Sales"); // 2 runs
    expect(result[0]?.recentRuns).toBe(2);
    expect(result[1]?.department).toBe("Ops"); // 1 run
  });

  it("ignores runs whose agent is not in the registry", () => {
    const result = computeDepartmentActivity([run("Deleted Agent"), run("Alpha")], registry);
    const total = result.reduce((sum, d) => sum + d.recentRuns, 0);
    expect(total).toBe(1);
  });
});
