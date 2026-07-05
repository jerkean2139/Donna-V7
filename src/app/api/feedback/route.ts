import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { errorField, logger } from "@/lib/logger";
import {
  cognitiveObjectRepository,
  embeddingProvider,
  feedbackWidgetKeyRepository,
} from "@/lib/repositories";
import { ingestFeedback, isOriginAllowed, resolveActiveWidgetKey } from "@/lib/feedback/service";
import { checkRateLimit } from "@/lib/security/rate-limit";

// Public, cross-origin ingest (excluded from the Clerk middleware in
// proxy.ts). Authenticates via the widget's public key, not a session.
export const dynamic = "force-dynamic";

const FEEDBACK_RATE_LIMIT = { windowMs: 60_000, maxRequests: 30 };

const ingestSchema = z.object({
  publicKey: z.string().min(1).max(64),
  message: z.string().min(1, "Feedback message is required.").max(5000),
  email: z.string().email().max(320).optional(),
  pageUrl: z.string().max(2000).optional(),
});

// CORS is a browser read-policy, NOT the security boundary -- the widget key
// plus the server-side origin allowlist are. Preflight can't see the key
// (no body), so OPTIONS echoes the origin permissively; the real gate runs
// on POST.
function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function OPTIONS(request: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: cors });
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid feedback payload." }, { status: 400, headers: cors });
  }

  const key = await resolveActiveWidgetKey(feedbackWidgetKeyRepository, parsed.data.publicKey);
  if (!key) {
    return NextResponse.json({ error: "Unknown or revoked widget key." }, { status: 401, headers: cors });
  }

  if (!isOriginAllowed(key.allowedOrigins, origin)) {
    return NextResponse.json({ error: "Origin not allowed for this widget key." }, { status: 403, headers: cors });
  }

  try {
    checkRateLimit(`feedback:${key.tenantId}`, FEEDBACK_RATE_LIMIT);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof DomainError ? error.message : "Too many requests." },
      { status: 429, headers: cors },
    );
  }

  try {
    const { objectId } = await ingestFeedback(cognitiveObjectRepository, embeddingProvider, {
      tenantId: key.tenantId,
      widgetKeyId: key.id,
      message: parsed.data.message,
      email: parsed.data.email ?? null,
      pageUrl: parsed.data.pageUrl ?? null,
    });
    logger.info("feedback.ingested", { tenantId: key.tenantId, widgetKeyId: key.id, objectId });
    return NextResponse.json({ ok: true }, { status: 201, headers: cors });
  } catch (error) {
    logger.error("feedback.ingest_failed", {
      tenantId: key.tenantId,
      widgetKeyId: key.id,
      error: errorField(error),
    });
    return NextResponse.json({ error: "Could not record feedback." }, { status: 500, headers: cors });
  }
}
