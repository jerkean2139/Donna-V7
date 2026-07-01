# Deploying Donna V7

The app is a Next.js 16 (App Router) server. It builds with `npm run build`
and runs with `npm run start`, binding to `PORT` (set automatically by most
hosts). CI must be green before promoting to `main`.

## Required environment variables

Set these in the host's environment (Railway → Variables). Never commit real
values — see `.env.example` for the shape.

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client + server | Safe to expose. From Clerk dashboard → API keys. |
| `CLERK_SECRET_KEY` | Server only | **Secret.** From Clerk dashboard → API keys. |
| `DATABASE_URL` | Migrations + app persistence | Postgres connection string. |

> Persistence is selected at runtime by `DATABASE_URL`: when it is set the app
> uses the Postgres/Drizzle repositories (run `npm run db:migrate` first so the
> schema exists); when it is unset the app falls back to in-memory repositories
> (data does not survive a restart). Set it in the host once you have a
> database provisioned.

## Railway (primary host)

`railway.json` configures the build/start/health check:

- **Build:** Nixpacks (auto-detects Next.js, runs `npm run build`)
- **Start:** `npm run start`
- **Health check:** `GET /api/health` → `{ "status": "ok" }` (public, no auth/DB)

Steps:

1. Create a Railway project from the GitHub repo, tracking the `main` branch.
2. Add the environment variables above.
3. (Optional, for persistence) Add a Railway Postgres plugin and set
   `DATABASE_URL`, then run `npm run db:migrate` against it.
4. Deploy. Railway polls `/api/health` to confirm the instance is live.

## Clerk one-time setup

These run on your machine (they need your Clerk credentials):

```bash
clerk auth login
clerk init --app <your_clerk_app_id>
clerk doctor
```

Then drop the two keys into `.env.local` for local dev and into the host's
variables for deploys. With auth active, `/dashboard` and `/cognitive-objects`
redirect to sign-in when signed out; `/` and `/api/health` stay public.

## Health check

`GET /api/health` returns `200 {"status":"ok"}` with no auth or database
dependency, so it works even before Clerk/DB are configured. Use it for the
host health check and any external uptime monitor.
