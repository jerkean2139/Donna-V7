import type { RiskLevel } from "../cognitive-object/types";

// Read tools inform reasoning and change nothing; the agent engine executes
// them inline. Act tools have side effects -- calling one never executes it
// directly. It becomes a ProposedAction that governance must clear first.
// This split is the whole point of Phase 2 (see PHASE_2_DESIGN.md, Decision 1):
// there is no code path from "agent calls an act tool" to "it happened"
// that skips governance.
export type ToolKind = "read" | "act";

export interface ToolDefinition {
  name: string;
  description: string;
  kind: ToolKind;
  // Only meaningful for act tools; read tools never need risk/reversibility
  // because they're never proposed as an action.
  riskLevel?: RiskLevel;
  reversible?: boolean;
}

export interface AgentDefinition {
  name: string;
  department: string;
  supervisor: string;
  skillPath: string; // relative to src/lib/agents/skills/
  routingKeywords: string[];
  tools: string[]; // tool names this agent may call, from the tool registry
}

export interface ToolCallRecord {
  toolName: string;
  kind: ToolKind;
  args: Record<string, unknown>;
  // For read tools: the tool's own output. For act tools: a short
  // human-readable note that the action was proposed, not a result --
  // there is no result yet because nothing executed.
  resultSummary: string;
}

export interface ProposedActionDraft {
  toolName: string;
  args: Record<string, unknown>;
  description: string;
  riskLevel: RiskLevel;
  reversible: boolean;
}

export interface DelegationRequest {
  agentName: string;
  task: string;
  reason: string;
}

export interface AgentRunInput {
  agentName: string;
  task: string;
  tenantId: string;
  objectId: string;
  // The object's own confidence/risk feed proposed-action governance
  // (Phase 2 design, Decision 7: effective risk = max(action risk, object risk)).
  objectRiskLevel: RiskLevel;
  objectConfidenceScore: number | null;
}

export interface AgentRunOutput {
  responseText: string;
  toolCalls: ToolCallRecord[];
  proposedActions: ProposedActionDraft[];
  delegationRequest: DelegationRequest | null;
}

export interface AgentEngine {
  runAgentTask(input: AgentRunInput): Promise<AgentRunOutput>;
}
