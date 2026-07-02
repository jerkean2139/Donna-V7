import { NextResponse } from "next/server";
import { checkPersistenceReady } from "@/lib/repositories";
import { logger } from "@/lib/logger";

// Readiness probe: unlike /api/health (pure liveness), this confirms the
// persistence layer can serve queries. Returns 503 so load balancers and
// uptime monitors can distinguish "process up" from "app usable".
// The Clerk middleware matcher excludes /api/health*, so this needs no auth.
export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await checkPersistenceReady();

  if (!readiness.ok) {
    logger.error("health.ready.failed", { persistence: readiness.mode });
    return NextResponse.json(
      { status: "unavailable", persistence: readiness.mode },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "ready", persistence: readiness.mode });
}
