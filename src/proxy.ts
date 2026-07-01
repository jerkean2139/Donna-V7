import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes remain accessible without an authenticated session.
// The marketing home page plus Clerk's own sign-in/sign-up flows stay open;
// everything else (dashboard, cognitive objects, API/tRPC) requires auth.
// (/api/health is excluded from the matcher below, so the middleware never
// runs on it — it needs no auth and no Clerk keys.)
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
