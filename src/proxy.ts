import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes remain accessible without an authenticated session.
// The marketing home page plus Clerk's own sign-in/sign-up flows stay open;
// everything else (dashboard, cognitive objects, API/tRPC) requires auth.
// (/api/health and /api/feedback are excluded from the matcher below, so the
// middleware never runs on them — health needs no auth, and feedback is a
// cross-origin public ingest that authenticates via its own widget key.)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, the public health check, the public feedback
    // ingest, and static assets. Excluding these keeps them free of any Clerk
    // dependency, so they work even before Clerk env vars are set and don't
    // interfere with the feedback endpoint's own CORS handling.
    "/((?!_next|api/health|api/feedback|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API and tRPC routes, except the health check and feedback.
    "/(api(?!/health|/feedback)|trpc)(.*)",
    // Clerk proxy / handshake paths.
    "/__clerk/:path*",
  ],
};
