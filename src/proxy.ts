import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Public routes remain accessible without an authenticated session.
// The marketing home page, the guide, plus Clerk's own sign-in/sign-up flows
// stay open; everything else (dashboard, cognitive objects, API/tRPC) requires
// auth. (/api/health is excluded from the matcher below, so the middleware
// never runs on it — it needs no auth and no Clerk keys.)
const isPublicRoute = createRouteMatcher([
  "/",
  "/guide",
  "/offline",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

// Only throttle state-changing traffic: mutating Server Action POSTs and the
// API surface. GET navigations are left alone so browsing stays snappy.
function shouldRateLimit(request: Request, pathname: string): boolean {
  return request.method === "POST" || pathname.startsWith("/api");
}

function clientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "anonymous";
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (shouldRateLimit(request, pathname)) {
    const { success, limit, remaining, reset } = await rateLimit(clientIdentifier(request));
    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return new NextResponse("Too many requests. Please slow down.", {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "RateLimit-Limit": String(limit),
          "RateLimit-Remaining": String(remaining),
        },
      });
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, the public health check, and static assets.
    // Excluding /api/health here keeps the platform liveness probe free of any
    // Clerk dependency, so it stays green even before Clerk env vars are set.
    "/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API and tRPC routes, except the health check.
    "/(api(?!/health)|trpc)(.*)",
    // Clerk proxy / handshake paths.
    "/__clerk/:path*",
  ],
};
