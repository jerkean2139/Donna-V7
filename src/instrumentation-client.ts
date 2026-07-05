import * as Sentry from "@sentry/nextjs";

// Runs in the browser. NEXT_PUBLIC_ vars only -- nothing secret belongs here.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  tracesSampleRate: 0.1,
  // Tenant content (Cognitive Object bodies, AI reasoning output) must never
  // leave the browser via error breadcrumbs. Strip request/response bodies;
  // keep everything else Sentry's default scrubber already redacts.
  beforeSend(event) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
