import { AGENT_REGISTRY } from "./registry";
import { getToolDefinition } from "./tools/registry";
import type { AgentEngine, AgentRunInput, AgentRunOutput, ProposedActionDraft, ToolCallRecord } from "./types";

// Deterministic, keyless, no-network engine -- same role as
// FakeReasoningEngine in Phase 1. It never calls a real tool (not even the
// credential-free web_search/web_fetch), so tests stay fully offline. For
// each act tool an agent is configured with, it produces one canned
// ProposedActionDraft with plausible arguments; for each read tool, one
// canned ToolCallRecord. This is enough to exercise the full governed-action
// pipeline (propose -> governance -> auto-execute or await approval) without
// a live model or network access.
export class FakeAgentEngine implements AgentEngine {
  async runAgentTask(input: AgentRunInput): Promise<AgentRunOutput> {
    const agent = AGENT_REGISTRY[input.agentName];
    if (!agent) {
      throw new Error(`Unknown agent: ${input.agentName}`);
    }

    const toolCalls: ToolCallRecord[] = [];
    const proposedActions: ProposedActionDraft[] = [];

    for (const toolName of agent.tools) {
      const definition = getToolDefinition(toolName);
      if (!definition) continue;

      if (definition.kind === "read") {
        toolCalls.push({
          toolName,
          kind: "read",
          args: { query: input.task },
          resultSummary: `[fake] Simulated result for ${toolName} on: ${input.task}`,
        });
        continue;
      }

      const draft = buildFakeActionDraft(toolName, input, definition.riskLevel!, definition.reversible!);
      if (draft) {
        proposedActions.push(draft);
        toolCalls.push({
          toolName,
          kind: "act",
          args: draft.args,
          resultSummary: `[fake] Proposed action: ${draft.description}`,
        });
      }
    }

    return {
      responseText: `[fake] ${agent.name} processed: ${input.task}`,
      toolCalls,
      proposedActions,
      delegationRequest: null,
    };
  }
}

function buildFakeActionDraft(
  toolName: string,
  input: AgentRunInput,
  riskLevel: ProposedActionDraft["riskLevel"],
  reversible: boolean,
): ProposedActionDraft | null {
  if (toolName === "create_followup_object") {
    const args = { title: `Follow up: ${input.task}`, objectType: "issue", summary: input.task };
    return {
      toolName,
      args,
      description: `Create a follow-up issue: "${args.title}"`,
      riskLevel,
      reversible,
    };
  }

  if (toolName === "send_email") {
    const args = { to: "team@example.com", subject: `Re: ${input.task}`, body: `[fake draft] ${input.task}` };
    return {
      toolName,
      args,
      description: `Send an email to ${args.to}: "${args.subject}"`,
      riskLevel,
      reversible,
    };
  }

  return null;
}
