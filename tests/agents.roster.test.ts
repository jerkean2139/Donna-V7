import { buildAgentRoster, groupRosterByDepartment } from "../src/lib/agents/roster";
import type { AgentRunAggregate } from "../src/lib/agents/agent-run/repository";
import type { AgentDefinition } from "../src/lib/agents/types";

const registry: Record<string, AgentDefinition> = {
  "Deep Research": {
    name: "Deep Research",
    department: "EA",
    supervisor: "Kianna",
    skillPath: "ea/deep-research.md",
    routingKeywords: [],
    tools: ["web_search", "web_fetch"],
  },
  "GHL Funnels": {
    name: "GHL Funnels",
    department: "Sales",
    supervisor: "Jaweria",
    skillPath: "sales/ghl-funnels.md",
    routingKeywords: [],
    tools: ["web_search", "create_followup_object", "ghl_read", "ghl_write"],
  },
  Bookkeeping: {
    name: "Bookkeeping",
    department: "Accounting",
    supervisor: "Muju",
    skillPath: "accounting/bookkeeping.md",
    routingKeywords: [],
    tools: ["web_search", "create_followup_object"],
  },
};

describe("buildAgentRoster", () => {
  it("classifies a read-only agent (no act tools)", () => {
    const roster = buildAgentRoster(registry, []);
    const research = roster.find((a) => a.name === "Deep Research")!;
    expect(research.hasGovernedActions).toBe(false);
    expect(research.alwaysRequiresApproval).toBe(false);
    expect(research.tools.every((t) => t.kind === "read")).toBe(true);
  });

  it("flags an agent with an irreversible high-risk act tool as always-requires-approval", () => {
    const roster = buildAgentRoster(registry, []);
    const funnels = roster.find((a) => a.name === "GHL Funnels")!;
    expect(funnels.hasGovernedActions).toBe(true);
    expect(funnels.alwaysRequiresApproval).toBe(true);
    const ghlWrite = funnels.tools.find((t) => t.name === "ghl_write")!;
    expect(ghlWrite.kind).toBe("act");
    expect(ghlWrite.reversible).toBe(false);
  });

  it("classifies an agent with only a low-risk reversible act tool as governed but not gated", () => {
    const roster = buildAgentRoster(registry, []);
    const bookkeeping = roster.find((a) => a.name === "Bookkeeping")!;
    expect(bookkeeping.hasGovernedActions).toBe(true);
    expect(bookkeeping.alwaysRequiresApproval).toBe(false);
  });

  it("attaches real run stats and computes success rate, null when never run", () => {
    const aggregates: AgentRunAggregate[] = [
      { agentName: "Deep Research", totalRuns: 4, completedRuns: 3, failedRuns: 1 },
    ];
    const roster = buildAgentRoster(registry, aggregates);
    const research = roster.find((a) => a.name === "Deep Research")!;
    const bookkeeping = roster.find((a) => a.name === "Bookkeeping")!;

    expect(research.stats.totalRuns).toBe(4);
    expect(research.stats.successRate).toBe(75);
    expect(bookkeeping.stats.totalRuns).toBe(0);
    expect(bookkeeping.stats.successRate).toBeNull();
  });

  it("sorts entries by name", () => {
    const roster = buildAgentRoster(registry, []);
    expect(roster.map((a) => a.name)).toEqual(["Bookkeeping", "Deep Research", "GHL Funnels"]);
  });
});

describe("groupRosterByDepartment", () => {
  it("groups agents by department, departments sorted alphabetically", () => {
    const groups = groupRosterByDepartment(buildAgentRoster(registry, []));
    expect(groups.map((g) => g.department)).toEqual(["Accounting", "EA", "Sales"]);
    expect(groups.find((g) => g.department === "Sales")!.agents.map((a) => a.name)).toEqual([
      "GHL Funnels",
    ]);
  });
});
