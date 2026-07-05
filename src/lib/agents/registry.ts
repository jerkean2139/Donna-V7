import type { AgentDefinition } from "./types";

// Phase 2 PR1 proved the pattern with 4 representative agents (one per
// governed-action state: read-only, act-only-always-approval, mixed
// auto-executable, act-only-auto-executable). PR2 (this file) ports the
// remaining 32 KOB v2 skills, using the SAME 4 tools -- no new tool was
// built for PR2. Real GHL/email-sending connectors are still PR3.
//
// Tool assignment policy for the PR2 agents, applied uniformly rather than
// bespoke-tuned per agent (KOB v2 itself gave every agent the same global
// tool list; this repo's version scopes tools per-agent, but the *within-PR2*
// assignment is still a simple, explainable rule, not 32 one-off judgment
// calls):
//   - Every agent: web_search, web_fetch, create_followup_object. Read
//     tools are harmless to hand out broadly; create_followup_object is
//     low-risk/reversible/auto-executable and maps naturally onto nearly
//     every skill file's "escalate to supervisor" pattern.
//   - + send_email ONLY for agents whose core deliverable IS an email:
//     Recruitment (candidate comms), Proposals (client delivery), Email
//     Marketing (campaigns), Communication (drafts email/Slack for others),
//     Prospecting (cold outreach). Everyone else stays without it rather
//     than getting a tool that doesn't match their actual skill content.
//   - GHL Funnels and GHL Campaigns get ghl_read/ghl_write on top of the
//     default set (PR3's per-tenant credential connector, Decision 9).
//
// "supervisor" is carried over from KOB v2's skill files as-is (Kianna,
// Muju, Taha, Jeremy, Jaweria) rather than made tenant-configurable yet --
// that's real scope (Phase 2 design, Decision 5) deferred until a second
// tenant actually needs different supervisor names.
const DEFAULT_TOOLS = ["web_search", "web_fetch", "create_followup_object"];
const WITH_EMAIL_TOOLS = [...DEFAULT_TOOLS, "send_email"];
// PR3: GHL Funnels and GHL Campaigns get the real connector -- ghl_read
// executes inline, ghl_write always produces a Proposed Action (high risk,
// irreversible per the tools registry, so it never auto-executes).
const WITH_GHL_TOOLS = [...DEFAULT_TOOLS, "ghl_read", "ghl_write"];

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

  // ── Ops (Taha) ──
  "SOP Specialist": {
    name: "SOP Specialist",
    department: "Ops",
    supervisor: "Taha",
    skillPath: "ops/sop-specialist.md",
    routingKeywords: ["sop", "procedure", "documentation", "process document", "checklist", "runbook"],
    tools: DEFAULT_TOOLS,
  },
  "Process Automation": {
    name: "Process Automation",
    department: "Ops",
    supervisor: "Taha",
    skillPath: "ops/process-automation.md",
    routingKeywords: ["automate", "automation", "zapier", "n8n", "workflow automation", "integration"],
    tools: DEFAULT_TOOLS,
  },
  "Resource Specialist": {
    name: "Resource Specialist",
    department: "Ops",
    supervisor: "Taha",
    skillPath: "ops/resource-specialist.md",
    routingKeywords: ["resource", "capacity", "bandwidth", "workload", "staffing"],
    tools: DEFAULT_TOOLS,
  },

  // ── HR (Taha) ──
  Recruitment: {
    name: "Recruitment",
    department: "HR",
    supervisor: "Taha",
    skillPath: "hr/recruitment.md",
    routingKeywords: ["hire", "recruit", "onboard", "job posting", "candidate", "interview"],
    tools: WITH_EMAIL_TOOLS,
  },
  Engagement: {
    name: "Engagement",
    department: "HR",
    supervisor: "Taha",
    skillPath: "hr/engagement.md",
    routingKeywords: ["engagement", "morale", "culture", "team building", "recognition"],
    tools: DEFAULT_TOOLS,
  },
  Benefits: {
    name: "Benefits",
    department: "HR",
    supervisor: "Taha",
    skillPath: "hr/benefits.md",
    routingKeywords: ["benefits", "salary", "pto", "compensation", "leave", "health insurance", "employee benefits"],
    tools: DEFAULT_TOOLS,
  },
  Training: {
    name: "Training",
    department: "HR",
    supervisor: "Taha",
    skillPath: "hr/training.md",
    routingKeywords: ["training", "course", "skill gap", "learning", "workshop", "certification"],
    tools: DEFAULT_TOOLS,
  },

  // ── Sales (Taha, except GHL Funnels -> Jaweria) ──
  Prospecting: {
    name: "Prospecting",
    department: "Sales",
    supervisor: "Taha",
    skillPath: "sales/prospecting.md",
    routingKeywords: ["prospect", "lead gen", "cold outreach", "cold email", "qualify lead", "icp", "outreach"],
    tools: WITH_EMAIL_TOOLS,
  },
  Proposals: {
    name: "Proposals",
    department: "Sales",
    supervisor: "Taha",
    skillPath: "sales/proposals.md",
    routingKeywords: ["proposal", "quote", "pitch", "sow", "scope of work", "bid"],
    tools: WITH_EMAIL_TOOLS,
  },
  Closing: {
    name: "Closing",
    department: "Sales",
    supervisor: "Taha",
    skillPath: "sales/closing.md",
    routingKeywords: ["close deal", "contract", "objection", "closing"],
    tools: DEFAULT_TOOLS,
  },
  Negotiation: {
    name: "Negotiation",
    department: "Sales",
    supervisor: "Taha",
    skillPath: "sales/negotiation.md",
    routingKeywords: ["negotiate", "counter", "pricing", "discount"],
    tools: DEFAULT_TOOLS,
  },
  "GHL Funnels": {
    name: "GHL Funnels",
    department: "Sales",
    supervisor: "Jaweria",
    skillPath: "sales/ghl-funnels.md",
    routingKeywords: ["funnel", "ghl", "gohighlevel", "lead capture"],
    tools: WITH_GHL_TOOLS,
  },

  // ── Marketing (Kianna) ──
  Content: {
    name: "Content",
    department: "Marketing",
    supervisor: "Kianna",
    skillPath: "marketing/content.md",
    routingKeywords: ["blog", "article", "seo", "copywriting", "headline"],
    tools: DEFAULT_TOOLS,
  },
  "Social Media": {
    name: "Social Media",
    department: "Marketing",
    supervisor: "Kianna",
    skillPath: "marketing/social-media.md",
    routingKeywords: ["social media", "instagram", "linkedin", "tiktok"],
    tools: DEFAULT_TOOLS,
  },
  "Email Marketing": {
    name: "Email Marketing",
    department: "Marketing",
    supervisor: "Kianna",
    skillPath: "marketing/email-marketing.md",
    routingKeywords: ["email campaign", "newsletter", "drip sequence", "subject line"],
    tools: WITH_EMAIL_TOOLS,
  },
  Advertising: {
    name: "Advertising",
    department: "Marketing",
    supervisor: "Kianna",
    skillPath: "marketing/advertising.md",
    routingKeywords: ["paid ads", "ppc", "roas", "google ads", "meta ads", "ad campaign", "ad spend", "retargeting"],
    tools: DEFAULT_TOOLS,
  },
  "GHL Campaigns": {
    name: "GHL Campaigns",
    department: "Marketing",
    supervisor: "Kianna",
    skillPath: "marketing/ghl-campaigns.md",
    routingKeywords: ["ghl campaign", "marketing automation", "sms campaign"],
    tools: WITH_GHL_TOOLS,
  },

  // ── Accounting (Muju) ──
  "Financial Reporting": {
    name: "Financial Reporting",
    department: "Accounting",
    supervisor: "Muju",
    skillPath: "accounting/financial-reporting.md",
    routingKeywords: ["financial report", "p&l", "balance sheet", "cash flow"],
    tools: DEFAULT_TOOLS,
  },
  "Tax Compliance": {
    name: "Tax Compliance",
    department: "Accounting",
    supervisor: "Muju",
    skillPath: "accounting/tax-compliance.md",
    routingKeywords: ["tax", "irs", "deduction", "1099", "filing"],
    tools: DEFAULT_TOOLS,
  },
  "Budget & Forecasting": {
    name: "Budget & Forecasting",
    department: "Accounting",
    supervisor: "Muju",
    skillPath: "accounting/budget-forecasting.md",
    routingKeywords: ["budget", "forecast", "projection", "variance"],
    tools: DEFAULT_TOOLS,
  },

  // ── I.T. (Muju, except Prompt Engineer + System Architect -> Jeremy) ──
  Helpdesk: {
    name: "Helpdesk",
    department: "I.T.",
    supervisor: "Muju",
    skillPath: "it/helpdesk.md",
    routingKeywords: ["help desk", "not working", "password reset", "vpn"],
    tools: DEFAULT_TOOLS,
  },
  Cybersecurity: {
    name: "Cybersecurity",
    department: "I.T.",
    supervisor: "Muju",
    skillPath: "it/cybersecurity.md",
    routingKeywords: ["vulnerability", "phishing", "breach", "security audit"],
    tools: DEFAULT_TOOLS,
  },
  Research: {
    name: "Research",
    department: "I.T.",
    supervisor: "Muju",
    skillPath: "it/research.md",
    routingKeywords: ["tech research", "tool comparison", "evaluate technology"],
    tools: DEFAULT_TOOLS,
  },
  "UI/UX Designer": {
    name: "UI/UX Designer",
    department: "I.T.",
    supervisor: "Muju",
    skillPath: "it/ui-ux-designer.md",
    routingKeywords: ["ui", "ux", "wireframe", "tailwind", "shadcn", "color palette", "typography"],
    tools: DEFAULT_TOOLS,
  },
  "Code Reviewer": {
    name: "Code Reviewer",
    department: "I.T.",
    supervisor: "Muju",
    skillPath: "it/code-reviewer.md",
    routingKeywords: ["review this code", "pull request review", "find bugs", "code review", "code smell"],
    tools: DEFAULT_TOOLS,
  },
  "Prompt Engineer": {
    name: "Prompt Engineer",
    department: "I.T.",
    supervisor: "Jeremy",
    skillPath: "it/prompt-engineer.md",
    routingKeywords: ["system prompt", "agent prompt", "hallucinating", "prompt optimization", "few-shot"],
    tools: DEFAULT_TOOLS,
  },
  "DevOps Engineer": {
    name: "DevOps Engineer",
    department: "I.T.",
    supervisor: "Muju",
    skillPath: "it/devops-engineer.md",
    routingKeywords: ["deployment", "docker", "nginx", "systemd", "ci/cd pipeline", "rollback", "health check"],
    tools: DEFAULT_TOOLS,
  },
  "System Architect": {
    name: "System Architect",
    department: "I.T.",
    supervisor: "Jeremy",
    skillPath: "it/system-architect.md",
    routingKeywords: ["system design", "microservices", "monolith", "design pattern", "service boundary"],
    tools: DEFAULT_TOOLS,
  },
  "Database Optimizer": {
    name: "Database Optimizer",
    department: "I.T.",
    supervisor: "Muju",
    skillPath: "it/database-optimizer.md",
    routingKeywords: ["slow query", "database performance", "query optimization", "connection pool", "query plan"],
    tools: DEFAULT_TOOLS,
  },

  // ── EA (Kianna, except Ideation Analyst -> Jeremy) ──
  Communication: {
    name: "Communication",
    department: "EA",
    supervisor: "Kianna",
    skillPath: "ea/communication.md",
    routingKeywords: ["draft email", "slack message", "meeting agenda"],
    tools: WITH_EMAIL_TOOLS,
  },
  "Team Tasking": {
    name: "Team Tasking",
    department: "EA",
    supervisor: "Kianna",
    skillPath: "ea/team-tasking.md",
    routingKeywords: ["assign task", "deadline", "overdue", "priority"],
    tools: DEFAULT_TOOLS,
  },
  "Ideation Analyst": {
    name: "Ideation Analyst",
    department: "EA",
    supervisor: "Jeremy",
    skillPath: "ea/ideation-analyst.md",
    routingKeywords: ["business idea", "new project", "brainstorm", "mvp", "vision", "opportunity"],
    tools: DEFAULT_TOOLS,
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
