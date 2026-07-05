import type { CognitiveGraphRepository } from "../../cognitive-graph/repository";
import { createCognitiveGraphEdge } from "../../cognitive-graph/service";
import type { CognitiveObjectRepository } from "../../cognitive-object/repository";
import type { ProposedAction } from "./types";

export interface ActionExecutionResult {
  success: boolean;
  resultSummary: string;
}

export interface ActionExecutor {
  execute(action: ProposedAction): Promise<ActionExecutionResult>;
}

// Real executor: create_followup_object needs no external credentials --
// it's a write against infrastructure this product already has (Phase 2
// design, Decision 10 distinguishes this from the external tools below).
// Links the new object back to the one the agent run was working on with a
// "resulted_in" edge (Decision 4's spirit: every action is auditable and
// tied back to its origin).
export class CreateFollowupObjectExecutor implements ActionExecutor {
  constructor(
    private readonly objectRepository: CognitiveObjectRepository,
    private readonly graphRepository: CognitiveGraphRepository,
    private readonly agentName: string,
  ) {}

  async execute(action: ProposedAction): Promise<ActionExecutionResult> {
    const args = action.args as { title?: unknown; objectType?: unknown; summary?: unknown };
    const title = typeof args.title === "string" ? args.title : "Untitled follow-up";
    const objectType =
      typeof args.objectType === "string" && ["decision", "research", "issue", "proposal"].includes(args.objectType)
        ? (args.objectType as "decision" | "research" | "issue" | "proposal")
        : "issue";
    const summary = typeof args.summary === "string" ? args.summary : null;

    const created = await this.objectRepository.create({
      tenantId: action.tenantId,
      createdByUserId: `agent:${this.agentName}`,
      objectType,
      title,
      summary,
      source: "system",
      riskLevel: "low",
      tags: ["agent-created"],
    });

    // Uses the graph SERVICE (not the repository directly): it enforces
    // tenant isolation on both endpoints and blocks duplicate edges, checks
    // the repository alone doesn't do.
    await createCognitiveGraphEdge(this.graphRepository, this.objectRepository, {
      tenantId: action.tenantId,
      fromObjectId: action.objectId,
      toObjectId: created.id,
      relationshipType: "resulted_in",
      strength: 100,
      source: "system_rule",
      createdByAgentId: this.agentName,
    });

    return {
      success: true,
      resultSummary: `Created follow-up ${objectType} "${title}" (${created.id}).`,
    };
  }
}

// Fake executor: send_email has no real connector yet -- sending real email
// needs per-tenant credentials (Decision 9), deferred to PR3. This records
// the action as executed without making any real network call, so the
// governed-action flow (propose -> approve -> execute) is fully testable
// end-to-end today, and swapping this for a real Resend-backed executor
// later touches no caller.
export class FakeSendEmailExecutor implements ActionExecutor {
  async execute(action: ProposedAction): Promise<ActionExecutionResult> {
    const args = action.args as { to?: unknown; subject?: unknown };
    const to = typeof args.to === "string" ? args.to : "unknown recipient";
    const subject = typeof args.subject === "string" ? args.subject : "(no subject)";
    return {
      success: true,
      resultSummary: `[SIMULATED] Would send email to ${to}: "${subject}". No real email integration configured yet.`,
    };
  }
}
