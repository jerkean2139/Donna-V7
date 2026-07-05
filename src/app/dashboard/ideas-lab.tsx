"use client";

import { useActionState } from "react";
import { idleFormState } from "@/lib/forms";
import { captureIdeaAction } from "./ideas-actions";

// The front door: type a rough idea, get a governed Cognitive Object -- and
// optionally let Donna reason over it right away. Two submit buttons carry
// the analyze flag via their name/value, so no extra state is needed.
export function IdeasLab() {
  const [state, formAction, isPending] = useActionState(captureIdeaAction, idleFormState);
  const fieldError = state.status === "error" ? state.fieldErrors?.idea : undefined;

  return (
    <section
      aria-labelledby="ideas-lab-heading"
      className="rounded-xl border border-border-default bg-bg-surface-1 p-5"
      style={{ borderTop: "2px solid var(--color-cyan)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="ideas-lab-heading"
          className="font-display text-[11px] font-semibold uppercase tracking-widest text-text-secondary"
        >
          Ideas Lab
        </h2>
        <span className="font-mono text-[10px] text-text-muted">idea → governed object</span>
      </div>

      {state.status === "error" && !fieldError && (
        <div
          className="mb-3 rounded-lg border border-red/30 bg-[var(--red-dim)] p-3 text-sm text-red"
          role="alert"
          aria-live="polite"
        >
          {state.message}
        </div>
      )}

      <form action={formAction} aria-busy={isPending}>
        <label htmlFor="ideas-lab-input" className="sr-only">
          Capture an idea
        </label>
        <textarea
          id="ideas-lab-input"
          name="idea"
          rows={3}
          required
          maxLength={5000}
          placeholder="What's on your mind? A decision to make, a problem to chase, a rough plan…"
          className="w-full rounded-lg border border-border-default bg-bg-surface-2 p-3 text-sm text-text-primary placeholder:text-text-muted"
          aria-invalid={Boolean(fieldError)}
        />
        {fieldError && (
          <p className="mt-1 text-sm text-red" role="alert">
            {fieldError}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            name="analyze"
            value="true"
            disabled={isPending}
            className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Working…" : "Capture & Analyze"}
          </button>
          <button
            type="submit"
            name="analyze"
            value="false"
            disabled={isPending}
            className="rounded-lg border border-border-default bg-bg-surface-2 px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-bright hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Capture only
          </button>
        </div>
      </form>
    </section>
  );
}
