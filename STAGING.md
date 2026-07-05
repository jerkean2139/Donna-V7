# Donna V7 — Staging Deploy Runbook

Goal: a clickable staging link to try the whole product (Mission Control, agent
roster, Ideas Lab, feedback widget, billing) end-to-end.

The app runs **fully keyless except for Clerk** — the AI engine, embeddings,
and all connectors fall back to deterministic fakes when their keys are absent,
and it can run with **no database** in an explicit ephemeral mode. So the only
hard requirement to see a working app is a Clerk instance.

## Minimum to get a working link

Set these environment variables on the host:

| Var | Required? | Notes |
|-----|-----------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes** | From a Clerk instance (free dev tier is fine). Without it every page 500s (`Missing publishableKey`). |
| `CLERK_SECRET_KEY` | **Yes** | Same Clerk instance. |
| `ALLOW_IN_MEMORY` | Yes for a DB-less demo | `true` lets it boot with no Postgres. Data resets on restart. Omit if you set `DATABASE_URL`. |
| `DATABASE_URL` | Optional | A Postgres with the `pgvector` extension. If set, run `npm run db:migrate` once. Omit to use in-memory mode. |
| `ANTHROPIC_API_KEY` | Optional | Enables real AI reasoning; without it the Evolution Loop uses the deterministic fake engine. |
| `VOYAGE_API_KEY` | Optional | Enables real embeddings; without it a deterministic fake embedder is used (semantic retrieval still works, lower quality). |
| `ENCRYPTION_KEY` | Optional | Only needed to store GHL/Resend integration credentials. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Optional | Error reporting. |

The **one manual step** you can't skip: create a Clerk instance and paste its
two keys. Everything else has a working fallback.

### Clerk setup (2 minutes)

1. Create an application at https://dashboard.clerk.com (or reuse one).
2. **Enable Organizations** (Configure → Organizations) — Donna is org-scoped;
   the tenant IS the Clerk org. Without an active org, tenant pages show a
   "choose a workspace" screen.
3. Copy the Publishable key and Secret key into the env vars above.
4. (Optional, for billing) Enable **Billing** and create plans with slugs
   `pro` and `enterprise`. Until then every workspace is on the free `starter`
   tier and the plan gate simply caps AI runs at the starter limit.

## Deploy — Railway (primary; `railway.json` is committed)

1. New Railway project → Deploy from GitHub repo `jerkean2139/Donna-V7`,
   branch `staging`.
2. Add the env vars above (at minimum the two Clerk keys + `ALLOW_IN_MEMORY=true`).
3. Railway uses `railway.json`: Nixpacks build, `npm run start`, healthcheck at
   `/api/health`.
4. (If you added `DATABASE_URL`) add a Railway Postgres, enable `pgvector`
   (`CREATE EXTENSION vector;`), and run `npm run db:migrate`.

## Deploy — Netlify (quick clickable link; `netlify.toml` is committed)

The official Next.js runtime is auto-detected. Set the same env vars in
Site configuration → Environment variables, then deploy the `staging` branch.

## What works without each optional key

- **No `DATABASE_URL`** (+ `ALLOW_IN_MEMORY=true`): full UI, data resets on restart.
- **No `ANTHROPIC_API_KEY`**: Evolution Loop + agents run on the fake engine — deterministic canned reasoning, governance still real.
- **No `VOYAGE_API_KEY`**: fake embedder — semantic retrieval works, lower quality.
- **No `ENCRYPTION_KEY`**: the Integrations page can't store GHL/Resend keys, but nothing else is affected.

## Health check

`GET /api/health` → `{ "status": "ok" }` (no auth, no Clerk, no DB).
`GET /api/health/ready` → checks the DB when one is configured.
