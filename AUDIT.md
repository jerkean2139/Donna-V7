# Donna-V7 Master Audit

Continuous audit-fix-verify loop toward a top-1% production app.
Baseline gate at audit start: typecheck ✅ · lint ✅ · tests 21/21 ✅.
Gate at audit end: typecheck ✅ · lint ✅ · tests 25/25 ✅ · production build ✅.

## Scorecard

| # | Dimension | Initial | Final | Target | Notes |
|---|-----------|---------|-------|--------|-------|
| 1 | Security | 4/10 | 8/10 | 9 | CSP + rate limiting deferred (decisions below) |
| 2 | Auth & Multi-tenancy | 6/10 | 9/10 | 10 | RLS defense-in-depth pending (decision below) |
| 3 | Database & Data integrity | 5/10 | 9/10 | 9 | ✅ |
| 4 | Code quality & Architecture | 7/10 | 8/10 | 9 | Layer-boundary lint rule still to add |
| 5 | API & Server Action design | 4/10 | 9/10 | 9 | ✅ |
| 6 | UI/UX & Accessibility | 2/10 | 8/10 | 9 | Design tokens / dark mode / responsive pass remain |
| 7 | Performance | 6/10 | 8/10 | 9 | EXPLAIN + bundle analysis not yet done against real data |
| 8 | Testing | 5/10 | 8/10 | 9 | Action-level tests with a Clerk mock would close the gap |
| 9 | Observability & Operations | 4/10 | 8/10 | 8 | ✅ |
| 10 | DX, CI/CD & Dependencies | 5/10 | 8/10 | 9 | Pre-commit hooks + README walkthrough remain |

## Findings ledger

| ID | Dim | Severity | Location | Description | Status |
|----|-----|----------|----------|-------------|--------|
| F1 | 2 | Critical | cognitive-graph/service.ts | Edge creation never verified from/to objects belong to the caller's tenant — cross-tenant references possible by UUID. | **fixed** — service now resolves both endpoints tenant-scoped; attack tests in both directions |
| F2 | 10 | Critical | package.json | Every dependency was `"latest"` — non-reproducible builds. | **fixed** — pinned to lockfile-resolved semver ranges |
| F3 | 6 | High | src/app/**, globals.css | UI written in Tailwind classes but Tailwind never installed — app shipped unstyled. | **fixed** — tailwindcss v4 via @tailwindcss/postcss |
| F4 | 6 | High | [id]/page.tsx | "Add relationship" linked to a page that didn't exist (404). | **fixed** — page + accessible form added |
| F5 | 1 | High | next.config.ts | No security headers. | **fixed** — XCTO, XFO, Referrer-Policy, Permissions-Policy, HSTS; CSP deferred (see decisions) |
| F6 | 5 | High | relationships/actions.ts | Manual string coercion, `as never` casts, no UUID validation, no length caps. | **fixed** — Zod schema with UUID/bounds/caps |
| F7 | 5 | High | both actions.ts | Actions threw raw errors → opaque 500s for users. | **fixed** — typed FormActionState; only DomainError messages surface |
| F8 | 6 | High | src/app | No error/not-found/loading boundaries, no nav shell, no pending states. | **fixed** — all added; org switcher in header |
| F9 | 3 | Medium | db/schema.ts | FKs had no onDelete policy. | **fixed** — cascade for derived data, restrict for audit trail (migration 0001) |
| F10 | 3 | Medium | db/schema.ts | No CHECK constraints on strength/score columns. | **fixed** — 0–100 checks + no-self-edge check |
| F11 | 3 | Medium | db/schema.ts | Approvals lacked created_at; duplicate edges allowed. | **fixed** — created_at added; unique (tenant, from, to, type) index. ⚠️ Dedupe production edges before running migration 0001 |
| F12 | 3/7 | Medium | cognitive-object/repository.ts | Unbounded tenant listing. | **fixed** — default 100, max 200, offset; in-memory ordering now matches Drizzle |
| F13 | 9 | Medium | api/health | Liveness only. | **fixed** — /api/health/ready checks DB with 2s timeout, 503 on failure |
| F14 | 9 | Medium | src/lib | No structured logging. | **fixed** — JSON logger wired into mutation actions (ids + outcome + duration only) |
| F15 | 6 | Medium | dashboard/page.tsx | Hardcoded zeros. | **fixed** — live open objects, approvals needed (governance-evaluated), graph link count, recent objects |
| F16 | 5 | Medium | cognitive-object/input.ts | No body length cap; unlimited tags. | **fixed** — body ≤ 20k, ≤ 20 tags of ≤ 64 chars |
| F17 | 3 | Low | db/client.ts | Default pool settings. | **fixed** — max 10, idle_timeout 20s, connect_timeout 10s |
| F18 | 2 | Low | — | No Postgres RLS defense-in-depth. | open — decision below |
| F19 | 1 | Low | npm audit | 7 moderate advisories, all transitive in dev/build tooling (esbuild via drizzle-kit; postcss via next, no upstream fix). No production runtime exposure. | wontfix — accepted, re-check on next dependency bump |

## Top 10 improvements made

1. Closed a Critical cross-tenant hole: graph edges can no longer reference another tenant's objects (with attack tests).
2. Reproducible builds: all 16 `"latest"` dependencies pinned.
3. The UI actually renders styled now — Tailwind v4 was referenced everywhere but never installed.
4. The relationship-creation flow works end-to-end (the linked page 404'd before) with an accessible, validated form.
5. Every user-facing mutation is Zod-validated with typed error results instead of opaque 500s; only intentional domain messages reach clients.
6. Database integrity: onDelete policies, 0–100 CHECK constraints, duplicate-edge unique index, no-self-edge check, approvals created_at (migration 0001).
7. Security headers on all routes (HSTS, XCTO, XFO, Referrer-Policy, Permissions-Policy).
8. Workspace UX: header nav with organization switcher; tenant pages render a "choose a workspace" state instead of crashing when no org is active.
9. Dashboard shows real tenant intelligence (open objects, approvals needed, graph links, recent objects).
10. Operations: DB-aware readiness probe + structured JSON logging with tenant/user/outcome/duration on every mutation.

## Remaining known debt (Medium/Low)

- ESLint `no-restricted-imports` rule to mechanically enforce app → service → repository → db layering.
- Action-level tests (happy path + auth failure + validation failure) using a Clerk mock.
- Pagination UI on the objects list (repo layer supports limit/offset; the page shows the newest 100).
- Design tokens, dark mode, and a real responsive/a11y pass (360/768/1280).
- README end-to-end walkthrough verification; pre-commit hooks (lint-staged) if desired.
- EXPLAIN analysis and bundle-size check once real data volume exists.

## DECISIONS_NEEDED (human call)

1. **Content-Security-Policy** — needs the production Clerk instance domain to write correct script/frame/connect allowances. Highest-value remaining security header.
2. **Rate limiting** on mutation actions — requires infra (e.g. Upstash Redis) or Railway-level protection. Decide budget/provider.
3. **Error tracking** (e.g. Sentry) — paid service decision; structured logs are the current stopgap.
4. **Postgres RLS** as tenant-isolation defense-in-depth — worth it before Phase 2 (external beta tenants); requires session-variable plumbing in the Drizzle client.
5. **Migration 0001 rollout** — if production already has duplicate relationship edges, dedupe before applying the unique index; schedule a maintenance window.
