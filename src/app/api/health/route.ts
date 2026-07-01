import { NextResponse } from "next/server";

// Lightweight liveness probe for the hosting platform (Railway healthcheck,
// load balancers, uptime monitors). No auth, no DB — it only reports that the
// server process is up and serving requests.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
