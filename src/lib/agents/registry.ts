import type { AgentDefinition } from "./types";

// Phase 2 PR1 scope: 4 representative agents (one per department pattern),
// not the full 29-skill KOB v2 roster. Chosen to cover every point in the
// governed-action state space with only 2 real read tools and 2 act tools:
//   - Deep Research: read-only, never proposes an action.
//   - Customer Service: act-only, its action (send_email) always requires
//     approval (external + irreversible).
//   - Programming: mixed read + act, its action (create_followup_object)
//     can auto-execute (internal + reversible + low risk).
//   - Bookkeeping: act-only, same auto-executable action as Programming, to
//     exercise an agent with no read tools at all.
// Remaining 25 skills port in PR2 once this pattern is proven end-to-end.
//
// "supervisor" is carried over from KOB v2's skill files as-is (Kianna,
// Muju, etc.) rather than made tenant-configurable yet -- that's real scope
// (Phase 2 design, Decision 5) deferred until a second tenant actually needs
// different supervisor names, matching this repo's discipline of not
// building for a hypothetical future.
export const AGENT_REGISTRY: Record<string, AgentDefinition> = {
  "Deep Research": {
    name: "Deep Research",
    department: "EA",
    supervisor: "Kianna",
    skillPath: "ea/deep-research.md",
    routingKeywords: ["research", "deep dive", "investigate", "market analysis", "competitor"],
    tools: ["web_search", "web_fetch"],
  },
  "Customer Service": {
    name: "Customer Service",
    department: "EA",
    supervisor: "Kianna",
    skillPath: "ea/customer-service.md",
    routingKeywords: ["customer", "complaint", "ticket", "support", "refund"],
    tools: ["send_email"],
  },
  Programming: {
    name: "Programming",
    department: "I.T.",
    supervisor: "Muju",
    skillPath: "it/programming.md",
    routingKeywords: [
      "code",
      "build",
      "develop",
      "api",
      "bug",
      "deploy",
      "feature",
      "migrate",
      "database migration",
      "ci/cd",
    ],
    tools: ["web_search", "create_followup_object"],
  },
  Bookkeeping: {
    name: "Bookkeeping",
    department: "Accounting",
    supervisor: "Muju",
    skillPath: "accounting/bookkeeping.md",
    routingKeywords: ["bookkeeping", "expense", "receipt", "invoice", "transaction"],
    tools: ["create_followup_object"],
  },
};

// Keyword routing only for PR1 (Phase 2 design, Decision 8): semantic
// routing rides on the same pgvector work already deferred from Phase 1.
// Longer, more specific keywords first so a message matching several
// agents' short keywords doesn't get outranked by noise.
export function routeToAgent(task: string): string | null {
  const message = task.toLowerCase();
  let best: { name: string; score: number } | null = null;

  for (const agent of Object.values(AGENT_REGISTRY)) {
    let score = 0;
    for (const keyword of agent.routingKeywords) {
      if (message.includes(keyword.toLowerCase())) {
        score += keyword.length; // longer/more specific matches count more
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { name: agent.name, score };
    }
  }

  return best?.name ?? null;
}
