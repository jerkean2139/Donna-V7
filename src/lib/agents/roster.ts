import type { RiskLevel } from "../cognitive-object/types";
import type { AgentRunAggregate } from "./agent-run/repository";
import { getToolDefinition } from "./tools/registry";
import type { AgentDefinition } from "./types";

export interface AgentToolProfile {
  name: string;
  kind: "read" | "act";
  riskLevel: RiskLevel | null;
  reversible: boolean | null;
}

export interface AgentRosterEntry {
  name: string;
  department: string;
  supervisor: string;
  tools: AgentToolProfile[];
  stats: {
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    // null (not 0) when the agent has never run -- the card shows "no runs
    // yet" rather than a misleading 0% success rate.
    successRate: number | null;
  };
  // Any act tool at all: this agent can change the world, so its writes go
  // through the Proposed-Action gate.
  hasGovernedActions: boolean;
  // Any act tool that is irreversible or high/critical risk -> this agent's
  // writes never auto-execute, they always wait for a human.
  alwaysRequiresApproval: boolean;
}

function toToolProfile(toolName: string): AgentToolProfile {
  const def = getToolDefinition(toolName);
  if (!def) {
    // Unknown tool name in a registry entry -- surface it honestly rather
    // than dropping it, so a misconfiguration is visible.
    return { name: toolName, kind: "read", riskLevel: null, reversible: null };
  }
  return {
    name: def.name,
    kind: def.kind,
    riskLevel: def.riskLevel ?? null,
    reversible: def.reversible ?? null,
  };
}

export function buildAgentRoster(
  registry: Record<string, AgentDefinition>,
  aggregates: AgentRunAggregate[],
): AgentRosterEntry[] {
  const statsByAgent = new Map(aggregates.map((agg) => [agg.agentName, agg]));

  return Object.values(registry)
    .map((definition) => {
      const tools = definition.tools.map(toToolProfile);
      const agg = statsByAgent.get(definition.name);
      const totalRuns = agg?.totalRuns ?? 0;

      return {
        name: definition.name,
        department: definition.department,
        supervisor: definition.supervisor,
        tools,
        stats: {
          totalRuns,
          completedRuns: agg?.completedRuns ?? 0,
          failedRuns: agg?.failedRuns ?? 0,
          successRate: totalRuns > 0 ? Math.round(((agg?.completedRuns ?? 0) / totalRuns) * 100) : null,
        },
        hasGovernedActions: tools.some((tool) => tool.kind === "act"),
        alwaysRequiresApproval: tools.some(
          (tool) =>
            tool.kind === "act" &&
            (tool.reversible === false || tool.riskLevel === "high" || tool.riskLevel === "critical"),
        ),
      } satisfies AgentRosterEntry;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export interface DepartmentGroup {
  department: string;
  agents: AgentRosterEntry[];
}

export function groupRosterByDepartment(entries: AgentRosterEntry[]): DepartmentGroup[] {
  const byDept = new Map<string, AgentRosterEntry[]>();
  for (const entry of entries) {
    const list = byDept.get(entry.department) ?? [];
    list.push(entry);
    byDept.set(entry.department, list);
  }
  return Array.from(byDept, ([department, agents]) => ({ department, agents })).sort((left, right) =>
    left.department.localeCompare(right.department),
  );
}
