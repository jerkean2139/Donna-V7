import type { ZodError } from "zod";

// Shared result shape for form-backed server actions. Actions return an error
// state for the form to render instead of throwing raw errors at the user;
// success paths redirect, so there is no success state.
export type FormActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export const idleFormState: FormActionState = { status: "idle" };

export function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}
