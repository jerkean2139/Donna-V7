"use client";

import { useActionState } from "react";
import { idleFormState } from "@/lib/forms";
import { mintWidgetKeyAction } from "./actions";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-sm text-red" role="alert">
      {message}
    </p>
  );
}

export function MintForm() {
  const [state, formAction, isPending] = useActionState(mintWidgetKeyAction, idleFormState);
  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="space-y-3" aria-busy={isPending}>
      {state.status === "error" && !fieldErrors.label && !fieldErrors.allowedOrigins && (
        <div
          className="rounded-lg border border-red/30 bg-[var(--red-dim)] p-3 text-sm text-red"
          role="alert"
          aria-live="polite"
        >
          {state.message}
        </div>
      )}

      <label className="block">
        <span className="text-xs font-medium text-text-secondary">Label</span>
        <input
          name="label"
          required
          maxLength={120}
          placeholder="e.g. Marketing site"
          className="mt-1 w-full rounded-lg border border-border-default bg-bg-surface-2 p-2.5 text-sm text-text-primary placeholder:text-text-muted"
          aria-invalid={Boolean(fieldErrors.label)}
        />
        <FieldError message={fieldErrors.label} />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-text-secondary">Allowed origins (optional)</span>
        <span className="ml-2 text-xs text-text-muted">one per line, e.g. https://example.com</span>
        <textarea
          name="allowedOrigins"
          rows={2}
          maxLength={2000}
          placeholder="https://example.com"
          className="mt-1 w-full rounded-lg border border-border-default bg-bg-surface-2 p-2.5 text-sm text-text-primary placeholder:text-text-muted"
          aria-invalid={Boolean(fieldErrors.allowedOrigins)}
        />
        <FieldError message={fieldErrors.allowedOrigins} />
        <p className="mt-1 text-xs text-text-muted">
          Leave empty to accept feedback from any site using this key.
        </p>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-cyan px-4 py-2.5 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create widget key"}
      </button>
    </form>
  );
}
