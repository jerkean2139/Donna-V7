# Deploy & Go-Live Checklist

This is the paint-by-numbers guide to taking Donna V7 from "builds green" to
"live and hardened." Work top to bottom. Nothing here needs code changes —
it's all accounts, environment variables, one database migration, and a
smoke test.

> **Stack:** Next.js 16 (App Router) · Postgres via Drizzle · Clerk (auth +
> organizations) · Sentry (errors) · Upstash (rate limiting) · Anthropic
> (AI reasoning).

---

## 0. Before you start — accounts you need

| Service | Why | Free tier OK? |
|---|---|---|
| **Clerk** | Auth + organizations (multi-tenant). **Required — the app will not boot without it.** | Yes |
| **Postgres** (Railway / Neon / Supabase) | Persistence. Without it, production refuses to start. | Yes |
| **Anthropic** | Real AI reasoning in the Evolution Loop. Optional — falls back to a deterministic engine. | Pay-as-you-go |
| **Sentry** | Error reporting. Optional but recommended. | Yes |
| **Upstash Redis** | Distributed rate limiting. Optional — falls back to in-memory. | Yes |

---

## 1. Environment variables

Set these in your hosting platform's dashboard (Vercel: *Project → Settings →
Environment Variables*; Railway: *Variables* tab). **Never commit real values.**
`.env.example` in the repo root is the canonical list.

### Required (app won't work without these)

```bash
# Clerk — from dashboard.clerk.com → API Keys (use the LIVE keys for prod)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx

# Database — your Postgres connection string
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Recommended

```bash
# Anthropic — enables real reasoning (without it, a fake engine is used)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# Sentry — error reporting (server + browser use the same DSN value)
SENTRY_DSN=https://xxxxx@oXXXXXX.ingest.us.sentry.io/XXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@oXXXXXX.ingest.us.sentry.io/XXXXXXX
SENTRY_ORG=kean-on-biz
SENTRY_PROJECT=donna-v7
# Build-time only, for readable stack traces. Optional; build still works without it.
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxx

APP_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

### Optional — rate limiting (see §2) and CSP (see §4)

```bash
UPSTASH_REDIS_REST_URL=https://your-db-name-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXAAIjcD...long_token...
# RATE_LIMIT_MAX=100        # requests per IP per 60s (default 100)
# CSP_ENFORCE=true          # flip AFTER verifying — see §4
```

---

## 2. Upstash rate limiting — exact copy-paste format

Rate limiting works out of the box on an **in-memory fallback**. To make it
**global across all instances**, add Upstash. You only need **two** values,
and they're named exactly:

```bash
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-rest-token>
```

**Where to get them:**

1. Go to **console.upstash.com** → **Create Database** (type: Redis; pick a
   region close to your app).
2. Open the database → **REST API** tab.
3. Copy the two values shown there:
   - `UPSTASH_REDIS_REST_URL` → the `https://....upstash.io` line
   - `UPSTASH_REDIS_REST_TOKEN` → the long token line
4. Paste both into your host's environment variables **exactly as named above**
   (the code reads those exact key names — no renaming).

That's it. No code change — the app detects the keys on boot and switches from
in-memory to Upstash automatically. To confirm which backend is live, the value
of `rateLimitBackend` in `src/lib/rate-limit.ts` is `"upstash"` when both vars
are present, `"in-memory"` otherwise.

> **Tip:** you do NOT need the `@upstash/redis` "for Next.js" snippet or any
> other Upstash env vars — just those two REST values.

---

## 3. Database migration (run once per deploy that changes the schema)

The app **refuses to start in production without `DATABASE_URL`** (it won't
silently fall back to in-memory and lose writes).

```bash
# With DATABASE_URL set in your shell / CI:
npm run db:migrate
```

This applies everything in `drizzle/` (currently through the `objective`
column migration). It's additive and safe to run against an existing database.
Run it **before or as part of** the deploy, not after users hit the new code.

---

## 4. Content-Security-Policy — the two-step go-live

CSP ships in **Report-Only** mode: violations are logged to the browser console
but nothing is blocked, so it **cannot** white-screen your site. Turn on
enforcement only after you've confirmed it's clean against the real Clerk domain.

1. **Deploy as-is** (Report-Only is the default — no env needed).
2. Open the deployed site, sign in, and click through every page with the
   browser **DevTools → Console** open. Look for `Content-Security-Policy`
   violation reports.
   - If Clerk or Sentry report a blocked origin, add it to
     `NEXT_PUBLIC_CLERK_CSP_ORIGINS` or `NEXT_PUBLIC_SENTRY_CSP_ORIGINS`
     (space-separated) and redeploy.
3. When the console is clean, set **`CSP_ENFORCE=true`** and redeploy. The same
   policy now enforces (header flips from `Content-Security-Policy-Report-Only`
   to `Content-Security-Policy`).

---

## 5. Deploy

```bash
npm ci
npm run build      # must succeed; also runs Sentry source-map upload if token set
npm start          # or let your platform run `next start`
```

On **Vercel**: connect the repo, set the env vars above, and it builds/deploys
on push. On **Railway/Render**: point at the repo, set env vars, use
`npm run build` / `npm start`.

---

## 6. Post-deploy smoke test (do this every go-live)

Readiness endpoints (no auth required):

```bash
curl https://<your-domain>/api/health         # liveness — should be 200
curl https://<your-domain>/api/health/ready    # readiness — expect {"mode":"postgres","ok":true}
```

Then, signed in, click through this list:

- [ ] `/` landing page renders (dark neon hero).
- [ ] Sign in → land on **choose a workspace** → pick/create an organization.
- [ ] **Dashboard**: stat tiles count up; tap the **voice waveform** — Donna
      speaks the briefing and the visualizer reacts. (Voice needs a real
      browser; it won't play in headless.)
- [ ] **Create a decision** (`/decisions/new`) → it saves and redirects.
- [ ] Open the decision → **Start loop** → reasoning appears; **record an
      outcome**.
- [ ] **Cognitive Objects** list: search + type filter + pagination work.
- [ ] Add a **relationship** between two objects.
- [ ] `/guide` renders.
- [ ] On a phone: bottom tab bar works; **Add to Home Screen** installs the PWA
      and it opens standalone.
- [ ] DevTools console clean of CSP violations (then flip `CSP_ENFORCE=true`).
- [ ] Trigger an error path and confirm it shows in **Sentry**.

---

## 7. Rollback

Every deploy is a git commit on `main`. To roll back, redeploy the previous
commit from your platform's deployments list. The `objective` migration is
additive (a nullable column), so older code runs fine against the migrated
database — no schema rollback needed.

---

## Quick reference: what degrades gracefully vs. what's required

| Missing | Effect |
|---|---|
| `DATABASE_URL` | **App refuses to start** (by design). |
| Clerk keys | **App won't boot** (ClerkProvider throws). |
| `ANTHROPIC_API_KEY` | Reasoning uses a deterministic fake engine (no error). |
| Sentry vars | Errors only go to server logs (no crash). |
| Upstash vars | Rate limiting uses in-memory fallback (still works, per-instance). |
| `CSP_ENFORCE` | CSP stays Report-Only (nothing blocked). |
