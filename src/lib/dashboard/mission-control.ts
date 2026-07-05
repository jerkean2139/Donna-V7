import type { AgentRun } from "../agents/agent-run/types";
import type { ProposedAction } from "../agents/proposed-action/types";
import type { AgentDefinition } from "../agents/types";

// Mission Control's governance snapshot over a recent window of Proposed
// Actions. Every number is a real count from real rows -- the whole point of
// Phase 3 is that the dashboard never shows invented activity.
//
// The auto-vs-human split is read from decidedByUserId, which the service
// layer already sets truthfully: null when governance auto-executed a
// low-risk reversible action (createProposedActionFromDraft passes null), a
// real user id when a human approved it (approveAndExecuteProposedAction
// passes the approver). That distinction IS the product's value made
// countable.
export interface GovernanceActivity {
  autoExecuted: number;
  humanApproved: number;
  rejected: number;
  failed: number;
  executedTotal: number;
  windowSize: number;
}

export function computeGovernanceActivity(recentActions: ProposedAction[]): GovernanceActivity {
  let autoExecuted = 0;
  let humanApproved = 0;
  let rejected = 0;
  let failed = 0;

  for (const action of recentActions) {
    switch (action.status) {
      case "executed":
        if (action.decidedByUserId === null) {
          autoExecuted += 1;
        } else {
          humanApproved += 1;
        }
        break;
      case "rejected":
        rejected += 1;
        break;
      case "failed":
        failed += 1;
        break;
      default:
        break;
    }
  }

  return {
    autoExecuted,
    humanApproved,
    rejected,
    failed,
    executedTotal: autoExecuted + humanApproved,
    windowSize: recentActions.length,
  };
}

// Department strip: the full agent roster grouped by department, with how many
// runs each department produced in the recent window. agentCount comes from
// the registry (stable); recentRuns comes from real agent_runs, mapped back to
// a department via the same registry. Runs whose agent isn't in the registry
// (renamed/removed) are ignored rather than bucketed into a bogus department.
export interface DepartmentActivity {
  department: string;
  agentCount: number;
  recentRuns: number;
}

export function computeDepartmentActivity(
  runs: AgentRun[],
  registry: Record<string, AgentDefinition>,
): DepartmentActivity[] {
  const agentCountByDept = new Map<string, number>();
  for (const definition of Object.values(registry)) {
    agentCountByDept.set(definition.department, (agentCountByDept.get(definition.department) ?? 0) + 1);
  }

  const runCountByDept = new Map<string, number>();
  for (const run of runs) {
    const department = registry[run.agentName]?.department;
    if (!department) continue;
    runCountByDept.set(department, (runCountByDept.get(department) ?? 0) + 1);
  }

  return Array.from(agentCountByDept, ([department, agentCount]) => ({
    department,
    agentCount,
    recentRuns: runCountByDept.get(department) ?? 0,
  })).sort((left, right) => right.recentRuns - left.recentRuns || left.department.localeCompare(right.department));
}
