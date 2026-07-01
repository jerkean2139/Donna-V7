import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes remain accessible without an authenticated session.
// The marketing home page plus Clerk's own sign-in/sign-up flows stay open;
// everything else (dashboard, cognitive objects, API/tRPC) requires auth.
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
    // Skip Next.js internals and static assets, unless referenced in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API and tRPC routes.
    "/(api|trpc)(.*)",
    // Clerk proxy / handshake paths.
    "/__clerk/:path*",
  ],
};
