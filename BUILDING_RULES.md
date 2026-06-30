# Building Rules for Donna-V7

These rules are for human developers, Codex, Claude, ChatGPT, and any future agent working in this repository.

## Read first

Before making meaningful changes, read:

1. `MANIFESTO.md`
2. `PRINCIPLES.md`
3. `VOCABULARY.md`
4. `ARCHITECTURE.md`
5. `DECISION_OBJECT.md`
6. `EVOLUTION_LOOP.md`
7. `BUILDING_RULES.md`

Skipping these files is how we get a random chatbot wearing Donna’s name tag. Civilization has suffered enough.

## Default stack

Initial MVP assumptions:

- Next.js
- TypeScript
- Clerk for auth and organizations
- Railway for app hosting
- Railway Postgres for database
- Drizzle ORM
- Zod for validation
- Vitest for tests
- GitHub Actions for CI/security checks

Do not replace the stack without explaining the tradeoff in a Decision Object or pull request description.

## Repo direction

Donna-V7 should evolve toward a monorepo-style platform:

```text
apps/
  donna/
  admin/
  client-portal/

packages/
  intelligence-layer/
  decision-engine/
  governance-engine/
  memory-engine/
  loop-engine/
  agent-framework/
  shared/

docs/
infra/
```

Start simple. Structure for expansion. Do not build a cathedral when a clean workshop will do.

## Development workflow

1. Create a branch.
2. Describe the change as a Decision Object or PR summary.
3. Build the smallest useful slice.
4. Add or update tests.
5. Run lint, typecheck, test, and build.
6. Confirm tenant isolation where data is involved.
7. Confirm governance rules where AI actions are involved.
8. Open a pull request.

## Required pull request checks

Every pull request should answer:

- What changed?
- Why does this improve the Intelligence Layer?
- Does this touch tenant data?
- Does this touch AI outputs or actions?
- Does this require a human approval gate?
- What tests prove it works?
- What could go wrong?

## AI coding agent instructions

When using Codex or another AI coding agent:

1. Tell the agent to read the seven foundation docs first.
2. Ask it to summarize the intended architecture before coding.
3. Ask it to identify risks before implementation.
4. Ask it to build one vertical slice at a time.
5. Require tests for governance, tenant isolation, and permission boundaries.
6. Require the agent to explain files changed and why.

## Security rules

Never commit real secrets.

Never expose server-only environment variables to the browser.

Never trust client-supplied tenant IDs.

Never allow cross-tenant reads, writes, search results, vector retrieval, logs, or AI prompt context.

Never allow high-risk actions without approval.

## Governance rules

The system must require approval when:

- confidence is below tenant threshold
- risk is high or critical
- action sends external communication
- action modifies client data
- action deletes data
- action triggers payment, refund, billing, legal, medical, or compliance behavior
- context is missing or contradictory

## Definition of done

A feature is done only when:

- it supports the Intelligence Layer vision
- it uses shared vocabulary correctly
- it respects tenant boundaries
- it follows the Evolution Loop where appropriate
- it creates or updates Decision Objects when meaningful
- it has tests
- it can be explained clearly
- it does not create unnecessary complexity

## First MVP slice

Build this before chasing shiny objects:

1. Clerk auth
2. Clerk organizations mapped to tenants
3. Decision Object create/list/view
4. Evolution Loop status fields
5. Confidence score field
6. Approval required flag
7. Outcome and lesson learned fields
8. Basic dashboard
9. Governance tests
10. Railway deploy
