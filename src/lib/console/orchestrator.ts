import { AGENT_REGISTRY, routeToAgent } from "../agents/registry";

// Donna's turn planner: given a user message, decide whether Donna answers
// directly or calls a specialist agent into the conversation. Pure and
// deterministic (no AI key needed) so it is fully testable and works in dev/CI
// — the same fake-vs-real discipline the reasoning engine uses. A real
// LLM-backed planner can replace the body later without changing callers.

export interface DonnaTurnPlan {
  // What Donna says back in the thread.
  reply: string;
  // The agent she is bringing in, or null when she handles it herself.
  routedAgent: string | null;
  // Short human-readable reason for the routing (or why she is handling it).
  rationale: string;
}

const GREETING = /^(hi|hey|hello|yo|good (morning|afternoon|evening)|thanks|thank you|ok|okay)\b/i;

// The keywords from an agent's registry entry that appear in the message —
// used to explain Donna's routing choice ("matched: research, competitor").
export function matchedKeywords(agentName: string, message: string): string[] {
  const agent = AGENT_REGISTRY[agentName];
  if (!agent) return [];
  const lower = message.toLowerCase();
  return agent.routingKeywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
}

export function planDonnaTurn(userMessage: string): DonnaTurnPlan {
  const message = userMessage.trim();

  if (message.length === 0) {
    return {
      reply: "I'm here — tell me what you're working on and I'll take it from there.",
      routedAgent: null,
      rationale: "Empty message.",
    };
  }

  // Greetings / acknowledgements: Donna stays conversational, routes nothing.
  if (GREETING.test(message) && message.split(/\s+/).length <= 4) {
    return {
      reply: "Hey — what are we working on? Describe the task and I'll bring in the right specialist.",
      routedAgent: null,
      rationale: "Greeting; no task to route yet.",
    };
  }

  const agentName = routeToAgent(message);

  if (agentName) {
    const agent = AGENT_REGISTRY[agentName]!;
    const hits = matchedKeywords(agentName, message);
    const because = hits.length > 0 ? ` (matched: ${hits.slice(0, 3).join(", ")})` : "";
    return {
      reply: `On it. I'm bringing in ${agentName} from ${agent.department} for this${because}. I'll capture it as a Cognitive Object and hand it over.`,
      routedAgent: agentName,
      rationale: `Routed to ${agentName} — ${agent.department}.`,
    };
  }

  // No specialist matched: Donna handles it herself by capturing the intent.
  return {
    reply:
      "Got it. I don't have a specialist that clearly owns this, so I'll capture it as a Cognitive Object and we can run the Evolution Loop or route it manually.",
    routedAgent: null,
    rationale: "No agent matched the message keywords.",
  };
}
