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
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

export function errorField(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
