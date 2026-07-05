import type { ReasoningInput, RetrievedContextItem } from "../../src/lib/ai/types";

// Golden set for the decision-quality eval harness (Phase 1 design, Decision
// 8). These are NOT literal historical records pulled from KOB v2's
// database -- that data lives in SQLite files with no portable structured
// export, so this set is hand-authored, grounded in the real business
// context surfaced during the 9-repo audit and the consolidation work done
// so far. Documented scope decision, same as the pgvector deferral in
// context-retriever.ts.
//
// Each fixture is designed to land in a specific quality band so the eval
// suite can assert the reasoning engine + judge behave as expected on both
// well-grounded and deliberately weak inputs -- an eval that only contains
// "good" cases can't tell you the judge actually penalizes bad ones.
export type QualityBand = "strong" | "moderate" | "weak";

export interface GoldenFixture {
  id: string;
  description: string;
  input: ReasoningInput;
  expectedQualityBand: QualityBand;
}

function ctx(items: RetrievedContextItem[]): RetrievedContextItem[] {
  return items;
}

export const GOLDEN_SET: GoldenFixture[] = [
  {
    id: "ghl-pricing-increase",
    description: "Raise GHL agency base plan price, backed by churn history from a prior increase.",
    expectedQualityBand: "strong",
    input: {
      object: {
        id: "obj_ghl_pricing",
        objectType: "decision",
        title: "Raise the GHL agency base plan from $497 to $597/mo",
        objective: "Increase margin on the agency tier without losing existing clients.",
        summary: "Base plan hasn't moved in 18 months; costs (GPU, Anthropic API) have grown.",
        body: "Current base plan is $497/mo across 12 clients. Vast.ai GPU costs and Claude API spend have risen roughly 30% since pricing was set. Propose $597/mo for new signups, grandfathering existing clients for 90 days with notice.",
        riskLevel: "medium",
        tags: ["pricing", "ghl", "agency"],
      },
      context: ctx([
        {
          objectId: "obj_prior_increase",
          objectType: "lesson",
          title: "2025 pricing increase retro: churn stayed under 5%",
          summary: "Last price increase (from $397 to $497) saw 1 of 9 clients churn, both citing unrelated reasons.",
          relationshipType: "supports",
          strength: 90,
          retrievalMethod: "graph",
        },
        {
          objectId: "obj_cost_report",
          objectType: "research",
          title: "Q2 infra cost report: GPU + API spend up 32% YoY",
          summary: "Vast.ai GPU rental and Anthropic API usage both grew faster than client count.",
          relationshipType: "supports",
          strength: 85,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "moneyball-bankroll-increase",
    description: "Double the Moneyball paper-mode bankroll with no track record cited.",
    expectedQualityBand: "weak",
    input: {
      object: {
        id: "obj_moneyball_bankroll",
        objectType: "decision",
        title: "Double the Moneyball bankroll from $500 to $1000",
        objective: null,
        summary: "Feels like it's working, want to size up.",
        body: null,
        riskLevel: "high",
        tags: ["moneyball", "bankroll"],
      },
      context: ctx([]),
    },
  },
  {
    id: "donna-pgvector-now",
    description: "Whether to build pgvector semantic retrieval now vs. defer, citing the Phase 1 design doc.",
    expectedQualityBand: "strong",
    input: {
      object: {
        id: "obj_pgvector_timing",
        objectType: "proposal",
        title: "Defer pgvector semantic retrieval to a follow-up, ship graph-only retrieval now",
        objective: "Decide whether Phase 1 should include a live Postgres migration.",
        summary: "The reasoning engine needs a context retriever; semantic search needs a schema migration.",
        body: "Graph-only retrieval (1-hop neighbors, existing repository methods) can be built and fully tested today with in-memory repos. Semantic retrieval needs an embedding column, a migration, and an embeddings provider, and can only be verified against a real Postgres instance, which is not available in this environment.",
        riskLevel: "medium",
        tags: ["donna-v7", "architecture", "ai"],
      },
      context: ctx([
        {
          objectId: "obj_phase1_design",
          objectType: "decision",
          title: "Phase 1 design: Decision 4, context retrieval tiers",
          summary: "Explicitly scopes Tier 1 (graph) now, Tier 2 (semantic) as an additive follow-up.",
          relationshipType: "supports",
          strength: 100,
          retrievalMethod: "graph",
        },
        {
          objectId: "obj_no_test_db",
          objectType: "issue",
          title: "No real Postgres available in the build sandbox",
          summary: "All repository tests currently run against in-memory or mocked implementations.",
          relationshipType: "supports",
          strength: 80,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "academy-add-ghl-module",
    description: "Add a GHL integration module to VybeKoderz Academy with light supporting research.",
    expectedQualityBand: "moderate",
    input: {
      object: {
        id: "obj_academy_ghl_module",
        objectType: "proposal",
        title: "Add a GHL automation module to VybeKoderz Academy curriculum",
        objective: "Round out the curriculum's 'LAUNCH' phase, which is currently an empty title slide.",
        summary: "GHL is the most common integration students ask about after 'DEPLOY'.",
        body: null,
        riskLevel: "low",
        tags: ["academy", "curriculum", "ghl"],
      },
      context: ctx([
        {
          objectId: "obj_academy_gap",
          objectType: "research",
          title: "Academy module audit: 4 of 10 modules are empty title slides",
          summary: "MIGRATE, DEPLOY, LAUNCH, and GHL modules have no content yet.",
          relationshipType: "supports",
          strength: 70,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "widget-unauth-read-fix",
    description: "Fix the unauthenticated ticket-read endpoint in KOB v1's feedback widget backend.",
    expectedQualityBand: "weak",
    input: {
      object: {
        id: "obj_widget_unauth_fix",
        objectType: "issue",
        title: "Fix unauthenticated GET /api/tickets/{id} in KOB Command Center v1",
        objective: null,
        summary: "Anyone with a ticket UUID can read the full thread, including reporter emails.",
        body: null,
        riskLevel: "critical",
        tags: ["security", "kob-widget"],
      },
      context: ctx([]),
    },
  },
  {
    id: "rotate-credentials-after-audit",
    description: "Rotate every credential after the KOB v2 plaintext-secrets finding, backed by the audit.",
    expectedQualityBand: "strong",
    input: {
      object: {
        id: "obj_rotate_credentials",
        objectType: "decision",
        title: "Rotate every credential referenced in TEAM_GUIDE.md and ACCESS_GUIDE.md",
        objective: "Close the plaintext-secrets exposure found during the 9-repo audit.",
        summary: "KOB v2's working tree has plaintext passwords for every service and team member.",
        body: "Portal/Donna logins for 6 team members, GHL/Zenoflo keys, Slack tokens, Twilio, Telegram, Vast.ai, The Odds API, GitHub org token, Google OAuth secrets, Resend, and the Paperclip board token are all readable in the repo. Vault key files also sit on disk next to the encrypted data they protect.",
        riskLevel: "critical",
        tags: ["security", "kob-v2"],
      },
      context: ctx([
        {
          objectId: "obj_security_audit",
          objectType: "research",
          title: "KOB v2 security audit: HIGH-01 unauthenticated Donna endpoints, HIGH-02 18 hardcoded secrets",
          summary: "Self-authored audit report lists both findings as open.",
          relationshipType: "supports",
          strength: 100,
          retrievalMethod: "graph",
        },
        {
          objectId: "obj_vault_key_location",
          objectType: "issue",
          title: "Vault key files stored on disk beside encrypted data",
          summary: ".vault_key and .session_key are in the working tree, not a secrets manager.",
          relationshipType: "supports",
          strength: 90,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "hire-second-engineer",
    description: "Hire a second engineer for the Donna V7 build with no budget or workload model attached.",
    expectedQualityBand: "weak",
    input: {
      object: {
        id: "obj_hire_engineer",
        objectType: "decision",
        title: "Hire a second engineer to speed up Donna V7 development",
        objective: null,
        summary: "Feels slow with one person on it.",
        body: null,
        riskLevel: "high",
        tags: ["hiring", "donna-v7"],
      },
      context: ctx([]),
    },
  },
  {
    id: "extract-moneyball-repo",
    description: "Extract Moneyball into its own repo, already executed with a documented scrub and test run.",
    expectedQualityBand: "strong",
    input: {
      object: {
        id: "obj_moneyball_extraction",
        objectType: "decision",
        title: "Extract Moneyball from kob-command-center-v2 into its own repository",
        objective: "Separate personal betting analytics from the sellable business platform.",
        summary: "Moneyball has zero code dependencies on the rest of KOB v2 and doesn't belong in a product repo.",
        body: "Scanned for cross-package imports (none found), scrubbed 5 deployment-coupling issues including a hardcoded server IP and a bypassed PIN check, ported all 13 unit test files (318 tests passing), and verified with a fresh clone from GitHub.",
        riskLevel: "low",
        tags: ["moneyball", "consolidation"],
      },
      context: ctx([
        {
          objectId: "obj_moneyball_scan",
          objectType: "research",
          title: "Moneyball extraction scan: dependency map, test inventory, secret scan",
          summary: "Confirmed no imports of donna/portal/analytics from any moneyball module.",
          relationshipType: "supports",
          strength: 95,
          retrievalMethod: "graph",
        },
        {
          objectId: "obj_moneyball_tests_pass",
          objectType: "research",
          title: "318 unit tests passing in the extracted repo layout",
          summary: "Full test suite run against the new flat repo-root layout after path fixes.",
          relationshipType: "supports",
          strength: 90,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "consolidate-nine-repos",
    description: "Consolidate 9 repos into one Donna platform via Option A, backed by the full repo audit.",
    expectedQualityBand: "strong",
    input: {
      object: {
        id: "obj_consolidation_option_a",
        objectType: "decision",
        title: "Consolidate 9 repos into Donna V7 via the 'engine into shell' strategy",
        objective: "Stop re-prototyping the same product; converge on one sellable platform.",
        summary: "Donna V7 has the best engineering; KOB v2 has the only working AI brain.",
        body: "Audited all 9 repos: 3 are empty placeholders, 2 are pure front-end mockups, 1 has ~20 imported modules that don't exist despite claiming 98/100 quality, 1 is 95% design docs. Donna V7 has real multi-tenancy, CI, and ~60 tests but no live AI. KOB v2 has real agent routing, tool use, and integrations but security debt and no tests for the AI layer itself. Port the engine into the shell rather than rebuilding either.",
        riskLevel: "critical",
        tags: ["consolidation", "strategy"],
      },
      context: ctx([
        {
          objectId: "obj_repo_audit",
          objectType: "research",
          title: "Full 9-repo audit: purpose, tech stack, maturity, gaps for each",
          summary: "Nine parallel deep-dive analyses covering every repo's actual state vs. claimed state.",
          relationshipType: "supports",
          strength: 100,
          retrievalMethod: "graph",
        },
        {
          objectId: "obj_option_comparison",
          objectType: "research",
          title: "Three consolidation strategies compared: engine-into-shell, strangler fig, greenfield",
          summary: "Greenfield carries highest risk given the repo history already shows 3 restarts (v3, 5.0, V7).",
          relationshipType: "supports",
          strength: 90,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "switch-provider-cheaper-model",
    description: "Route low-risk Evolution Loop runs to a cheaper model, with some cost data but no live measurement.",
    expectedQualityBand: "moderate",
    input: {
      object: {
        id: "obj_cheaper_model_routing",
        objectType: "proposal",
        title: "Route low-risk Evolution Loop runs to a cheaper model than the default",
        objective: "Reduce per-run AI cost for high-volume, low-stakes objects.",
        summary: "Most objects created are low risk; the default model may be more than they need.",
        body: null,
        riskLevel: "medium",
        tags: ["cost", "ai-routing"],
      },
      context: ctx([
        {
          objectId: "obj_model_routing_design",
          objectType: "decision",
          title: "Phase 1 model routing: escalate to a stronger model only for high/critical risk",
          summary: "Existing design already escalates UP for high risk; this proposal is about the default tier.",
          relationshipType: "references",
          strength: 75,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "launch-saas-no-waitlist",
    description: "Launch VybeKoderz SaaS at $99/seat immediately, no waitlist or validation cited.",
    expectedQualityBand: "weak",
    input: {
      object: {
        id: "obj_saas_launch_now",
        objectType: "proposal",
        title: "Launch the Donna SaaS tier at $99/seat/mo this week",
        objective: null,
        summary: "Platform is far enough along, might as well start charging.",
        body: null,
        riskLevel: "high",
        tags: ["saas", "launch", "pricing"],
      },
      context: ctx([]),
    },
  },
  {
    id: "enable-postgres-rls",
    description: "Enable Postgres row-level security on Donna V7, citing the open AUDIT.md finding.",
    expectedQualityBand: "strong",
    input: {
      object: {
        id: "obj_enable_rls",
        objectType: "issue",
        title: "Enable Postgres row-level security on all tenant-scoped tables",
        objective: "Close AUDIT.md finding F18: multi-tenancy is app-layer only, no RLS.",
        summary: "Every query is tenant-scoped in application code, but there is no database-level backstop.",
        body: "A bug in a single service function (missing a tenantId filter) is currently the only thing standing between tenants. RLS policies would make cross-tenant reads fail at the database layer even if application code has a defect.",
        riskLevel: "high",
        tags: ["security", "database", "multi-tenancy"],
      },
      context: ctx([
        {
          objectId: "obj_audit_f18",
          objectType: "research",
          title: "AUDIT.md finding F18: no Postgres RLS, app-layer isolation only",
          summary: "Self-authored audit explicitly flags this as open debt below the bar for a governance product.",
          relationshipType: "supports",
          strength: 100,
          retrievalMethod: "graph",
        },
        {
          objectId: "obj_shipsafe_tenant_rule",
          objectType: "lesson",
          title: "ShipSafe tenant isolation rule: mutations become 404s, not cross-tenant writes",
          summary: "The security spec this product is built to already assumes a database-level backstop exists.",
          relationshipType: "supports",
          strength: 85,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "open-source-skills-library",
    description: "Open source the 39-file agent skills library with no legal review mentioned.",
    expectedQualityBand: "weak",
    input: {
      object: {
        id: "obj_open_source_skills",
        objectType: "proposal",
        title: "Open source the department agent skills library",
        objective: null,
        summary: "Could be good marketing and community goodwill.",
        body: null,
        riskLevel: "medium",
        tags: ["open-source", "skills"],
      },
      context: ctx([]),
    },
  },
  {
    id: "telegram-alerts-loop-failures",
    description: "Add Telegram alerts when an Evolution Loop run fails, reusing the Moneyball notification pattern.",
    expectedQualityBand: "moderate",
    input: {
      object: {
        id: "obj_telegram_loop_alerts",
        objectType: "proposal",
        title: "Send a Telegram alert when an Evolution Loop run fails",
        objective: "Get faster visibility into AI provider outages or schema-mismatch failures.",
        summary: "Moneyball already has a working Telegram notification pattern that could be reused.",
        body: null,
        riskLevel: "low",
        tags: ["observability", "alerts"],
      },
      context: ctx([
        {
          objectId: "obj_moneyball_telegram",
          objectType: "research",
          title: "Moneyball's Telegram notification module (notifications.py)",
          summary: "Existing working pattern for bot token + chat ID based alerting.",
          relationshipType: "references",
          strength: 60,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "shipsafe-auto-merge-fixes",
    description: "Auto-merge ShipSafe's AI-generated fix PRs, contradicting the tool's own stated policy.",
    expectedQualityBand: "weak",
    input: {
      object: {
        id: "obj_shipsafe_automerge",
        objectType: "decision",
        title: "Auto-merge ShipSafe's AI-generated security fix PRs above a confidence threshold",
        objective: null,
        summary: "Would speed up remediation for customers.",
        body: null,
        riskLevel: "critical",
        tags: ["shipsafe", "automation"],
      },
      context: ctx([
        {
          objectId: "obj_shipsafe_no_automerge_rule",
          objectType: "decision",
          title: "ShipSafe CLAUDE.md rule: do not let auto-fix PRs merge automatically",
          summary: "Explicit existing rule stating fixes require human review and passing tests before merge.",
          relationshipType: "contradicts",
          strength: 100,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "moneyball-pin-required",
    description: "Require MONEYBALL_APP_PIN after removing the auth bypass, backed by the extraction scrub findings.",
    expectedQualityBand: "strong",
    input: {
      object: {
        id: "obj_moneyball_pin_required",
        objectType: "decision",
        title: "Require MONEYBALL_APP_PIN to be set; reject all auth attempts when unset",
        objective: "Close the auth bypass found during the Moneyball extraction (was always granting owner access).",
        summary: "The /moneyball/auth endpoint had a comment explaining the PIN check was skipped because the deployment relied on a Cloudflare tunnel for security.",
        body: "That assumption breaks the moment the code is deployed anywhere else, including the new standalone repo. PIN validation is restored and required; there is no insecure default.",
        riskLevel: "high",
        tags: ["security", "moneyball"],
      },
      context: ctx([
        {
          objectId: "obj_moneyball_secret_scan",
          objectType: "research",
          title: "Moneyball secret scan finding: auth bypass at api.py line 376",
          summary: "Comment explicitly documented the bypass and the tunnel-dependent security assumption.",
          relationshipType: "supports",
          strength: 100,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "deprecate-kob-widget-v1",
    description: "Deprecate KOB v1's feedback widget in favor of porting it behind v2's auth model.",
    expectedQualityBand: "moderate",
    input: {
      object: {
        id: "obj_deprecate_widget_v1",
        objectType: "decision",
        title: "Deprecate the standalone KOB Command Center v1 backend, keep only its widget frontend",
        objective: "Stop running an unauthenticated ticket-read API in production.",
        summary: "v1's widget UI is good; its backend has unauthenticated reads and open registration.",
        body: null,
        riskLevel: "low",
        tags: ["kob-widget", "consolidation"],
      },
      context: ctx([
        {
          objectId: "obj_widget_v1_asset",
          objectType: "lesson",
          title: "KOB v1 audit: KOBWidget.jsx is the one shippable asset, backend has auth holes",
          summary: "Widget itself is dependency-light and reusable; backend needs replacing, not the frontend.",
          relationshipType: "supports",
          strength: 80,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "escalate-opus-high-risk",
    description: "Escalate to a stronger model for high/critical risk objects, backed by the Phase 1 design doc.",
    expectedQualityBand: "strong",
    input: {
      object: {
        id: "obj_escalate_opus",
        objectType: "decision",
        title: "Escalate Evolution Loop reasoning to a stronger model when object risk is high or critical",
        objective: "Spend the better model where it matters most, not on every run.",
        summary: "Most objects created are low or medium risk and don't need the most expensive model.",
        body: "Default model handles low/medium risk. High/critical risk objects -- the ones where a wrong recommendation matters most -- escalate automatically. Model IDs are env-configured, not hardcoded, to avoid the model-string rot seen in KOB v2's codebase.",
        riskLevel: "medium",
        tags: ["ai-routing", "cost", "donna-v7"],
      },
      context: ctx([
        {
          objectId: "obj_kob_v2_hardcoded_models",
          objectType: "lesson",
          title: "KOB v2 lesson: model IDs hardcoded in 4+ files, some already stale/invalid",
          summary: "Audit found a suspicious mismatched model ID likely silently falling back to keyword routing.",
          relationshipType: "supports",
          strength: 85,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
  {
    id: "skip-billing-tests-for-launch",
    description: "Skip writing tests for the new billing integration to hit a launch date.",
    expectedQualityBand: "weak",
    input: {
      object: {
        id: "obj_skip_billing_tests",
        objectType: "proposal",
        title: "Ship the Stripe billing integration without a test suite to hit Friday's launch date",
        objective: null,
        summary: "Tests would take another few days; the date is already public.",
        body: null,
        riskLevel: "high",
        tags: ["billing", "launch"],
      },
      context: ctx([]),
    },
  },
  {
    id: "shipsafe-license-choice",
    description: "Adopt a proprietary license for ShipSafe, with the MIT-default discovery as context.",
    expectedQualityBand: "moderate",
    input: {
      object: {
        id: "obj_shipsafe_license",
        objectType: "decision",
        title: "Replace ShipSafe's MIT license with a proprietary all-rights-reserved license",
        objective: "Make the codebase's license match the intent to sell it as a closed product.",
        summary: "MIT was a scaffold default, not a deliberate choice -- the copyright line named the project, not the owner.",
        body: null,
        riskLevel: "medium",
        tags: ["licensing", "shipsafe"],
      },
      context: ctx([
        {
          objectId: "obj_mit_default_finding",
          objectType: "research",
          title: "MIT license traced to auto-generated scaffold, not a deliberate decision",
          summary: "Copyright holder read 'SafeShip' (the project name), the classic tell of a generator default.",
          relationshipType: "supports",
          strength: 90,
          retrievalMethod: "graph",
        },
      ]),
    },
  },
];
