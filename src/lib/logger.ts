type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

// Minimal structured logger: one JSON object per line so Railway (or any log
// drain) can index fields. Log identifiers and outcomes, never titles, bodies,
// or other tenant content.
function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  });

  if (level === "error") {
    console.error(line);
    reportErrorToSentry(event, fields);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

// Every existing and future logger.error() call reports to Sentry for free —
// no new call sites needed anywhere the logger is already used (e.g. the AI
// reasoning engine's evolution_loop.reasoning_failed). Server-only (logger.ts
// has no client callers today; typeof window guards it if that changes) and
// best-effort: a Sentry hiccup must never break the caller's own error path.
function reportErrorToSentry(event: string, fields: LogFields): void {
  if (typeof window !== "undefined") return;

  import("@sentry/nextjs")
    .then(({ captureMessage }) => {
      captureMessage(event, { level: "error", extra: fields });
    })
    .catch(() => {
      // Sentry unavailable or misconfigured; the console.error line above
      // already captured this, so there is nothing further to do.
    });
}

export const logger = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

export function errorField(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
