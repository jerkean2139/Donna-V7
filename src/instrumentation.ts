import * as Sentry from "@sentry/nextjs";

// Server + edge init, split by runtime since Clerk's middleware (src/proxy.ts)
// runs on the edge runtime while the rest of the app runs on Node. Both need
// their own Sentry.init call -- this is the supported pattern for
// @sentry/nextjs v8+ (replaces the old sentry.server.config.ts /
// sentry.edge.config.ts trio).
export async function register(): Promise<void> {
  const commonOptions = {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.APP_ENV ?? "development",
    tracesSampleRate: 0.1,
    beforeSend(event: Sentry.ErrorEvent) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  };

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(commonOptions);
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(commonOptions);
  }
}

export const onRequestError = Sentry.captureRequestError;
