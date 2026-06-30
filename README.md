# Manumation Intelligence Layer

> The Intelligence Layer for human-AI companies: a multi-tenant system that turns conversations, projects, memory, and AI loops into better decisions.

This repo is the starter specification and implementation scaffold for the Manumation MVP.

## Core positioning

Most AI systems automate answers.

Manumation automates better thinking.

The MVP is not “another chatbot.” It is a governed intelligence layer that helps a company:

1. Capture important work as **Decision Objects**.
2. Run those decisions through the **Manumation Evolution Loop**.
3. Retrieve organizational memory before answering.
4. Challenge assumptions before acting.
5. Produce confidence scores and human approval checkpoints.
6. Learn from outcomes after execution.

## Initial build path

```text
Codex -> GitHub -> GitHub Actions -> Railway -> Internal Team MVP -> Client Beta -> Multi-tenant Platform
```

## Recommended stack

- **App**: Next.js App Router + TypeScript
- **Auth / Organizations**: Clerk
- **Database**: Railway Postgres
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **AI provider abstraction**: OpenAI and/or Anthropic adapter
- **CI/CD**: GitHub Actions
- **Security scanning**: CodeQL, npm audit, dependency review, secret scan
- **Hosting**: Railway

## MVP modules

| Module | MVP Purpose |
|---|---|
| Auth | Users sign in with Clerk. Organizations become tenants. |
| Tenant Context | Every decision belongs to one Clerk organization / tenant. |
| Decision Objects | Store important decisions with objective, assumptions, evidence, confidence, approvals, and outcomes. |
| Evolution Loop | Structured reasoning pipeline before producing recommendations. |
| Memory | Retrieve prior decisions and notes before recommending. |
| Governance | Require approval when risk or confidence thresholds demand it. |
| Dashboard | Internal view of active decisions, approvals, and loop status. |

## Repository map

```text
.github/
  workflows/
    ci.yml
    codeql.yml
    dependency-review.yml
    secret-scan.yml
  dependabot.yml

docs/
  00-loop-sequence.md
  01-manifesto.md
  02-evolution-system-spec.md
  03-decision-object-spec.md
  04-mvp-build-instructions.md
  05-env-vars.md
  06-railway-deploy.md
  07-codex-build-prompt.md
  08-security-checklist.md

src/
  app/
  db/
  lib/

tests/
```

## Local quick start

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run db:migrate
npm run dev
```

## Release rule

A feature is not ready because it works.

A feature is ready when it improves the quality of human judgment, preserves context, reduces false confidence, and makes the next decision easier.
