# Donna-V7 Master Audit

Continuous audit-fix-verify loop toward a top-1% production app.
Baseline gate at audit start: typecheck ✅ · lint ✅ · tests 21/21 ✅.

## Scorecard

| # | Dimension | Initial | Current | Target |
|---|-----------|---------|---------|--------|
| 1 | Security | 4/10 | 4/10 | 9 |
| 2 | Auth & Multi-tenancy | 6/10 | 6/10 | 10 |
| 3 | Database & Data integrity | 5/10 | 5/10 | 9 |
| 4 | Code quality & Architecture | 7/10 | 7/10 | 9 |
| 5 | API & Server Action design | 4/10 | 4/10 | 9 |
| 6 | UI/UX & Accessibility | 2/10 | 2/10 | 9 |
| 7 | Performance | 6/10 | 6/10 | 9 |
| 8 | Testing | 5/10 | 5/10 | 9 |
| 9 | Observability & Operations | 4/10 | 4/10 | 8 |
| 10 | DX, CI/CD & Dependencies | 5/10 | 5/10 | 9 |

## Findings ledger

| ID | Dim | Severity | Location | Description | Status |
|----|-----|----------|----------|-------------|--------|
| F1 | 2 | Critical | src/app/cognitive-objects/[id]/relationships/actions.ts:29, src/lib/cognitive-graph/service.ts:17 | Edge creation never verifies fromObjectId/toObjectId belong to the caller's tenant. Tenant A can create relationships referencing Tenant B's object IDs (cross-tenant write/reference; DB FK does not include tenant). | open |
| F2 | 10 | Critical | package.json | Every dependency pinned to "latest" — builds are non-reproducible; any install can pull breaking majors. | open |
| F3 | 6 | High | src/app/**/*.tsx, src/app/globals.css | Entire UI is written with Tailwind utility classes but Tailwind is not installed or imported — the app renders unstyled HTML in production. | open |
| F4 | 6 | High | src/app/cognitive-objects/[id]/page.tsx:73 | "Add relationship" links to /cognitive-objects/[id]/relationships/new, which has no page.tsx — the flow 404s. The relationships action is dead code from the UI. | open |
| F5 | 1 | High | next.config.ts | No security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors). | open |
| F6 | 5 | High | src/app/cognitive-objects/[id]/relationships/actions.ts:11-27 | Manual string coercion instead of Zod; `relationshipType as never` double-cast; no UUID validation; no max length on evidenceSummary. | open |
| F7 | 5 | High | src/app/cognitive-objects/actions.ts, relationships/actions.ts | Actions throw raw errors (Zod errors, service errors) — users get an opaque Next.js 500 digest; no typed error result or form error surface. | open |
| F8 | 6 | High | src/app | No error.tsx, loading.tsx, or not-found.tsx anywhere; no navigation shell; forms have no pending/disabled state. | open |
| F9 | 3 | Medium | src/db/schema.ts:95-96,118,145,164 | FKs to cognitive_objects have no explicit onDelete behavior; deleting an object will raise FK errors with no policy. | open |
| F10 | 3 | Medium | src/db/schema.ts:98,79,128-129 | strength / confidence_score / release_score / success_score have no DB CHECK constraints (app-only bounds). | open |
| F11 | 3 | Medium | src/db/schema.ts:140-157 | cognitive_object_approvals has no created_at; relationships allow exact duplicates (no unique index on tenant/from/to/type). | open |
| F12 | 3/7 | Medium | src/lib/cognitive-object/repository.ts:125 | listByTenant is unbounded — no pagination or max page size. | open |
| F13 | 9 | Medium | src/app/api/health/route.ts | Liveness only; no readiness probe that checks DB reachability with a timeout. | open |
| F14 | 9 | Medium | src/lib/** | No structured logging at service boundaries; failures surface only as raw stack traces. | open |
| F15 | 6 | Medium | src/app/dashboard/page.tsx | Dashboard shows hardcoded zeros instead of real tenant data (ARCHITECTURE.md requires open decisions/approvals/loop runs). | open |
| F16 | 5 | Medium | src/lib/cognitive-object/input.ts:8 | body has no max length; tags accept unlimited count/length via comma split. | open |
| F17 | 3 | Low | src/db/client.ts | postgres() client created with default pool settings; no max/idle_timeout tuning for serverless; dev hot-reload can accumulate clients. | open |
| F18 | 2 | Low | drizzle | No Postgres RLS as defense-in-depth (app-layer scoping only). | open |

## DECISIONS_NEEDED

- **Rate limiting** on mutation actions requires infra (Upstash/Redis or middleware service) — deferred, needs a product/infra decision.
- **Error tracking** (Sentry or similar) is a paid/infra decision — structured logs added instead for now.
- **Postgres RLS**: recommended as defense-in-depth once tenant count grows; requires session-variable plumbing through the Drizzle client.
