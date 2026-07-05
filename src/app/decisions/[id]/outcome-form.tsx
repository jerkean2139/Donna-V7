"use client";

import { useActionState } from "react";
import { idleFormState } from "@/lib/forms";
import { recordDecisionOutcomeAction } from "./actions";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-rose-300" role="alert">{message}</p>;
}

export function OutcomeForm({ decisionId }: { decisionId: string }) {
  const [state, formAction, isPending] = useActionState(recordDecisionOutcomeAction, idleFormState);
  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="mt-4 space-y-3 donna-card rounded-lg p-4" aria-busy={isPending}>
      {state.status === "error" && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200" role="alert" aria-live="polite">
          {state.message}
        </div>
      )}

      <input type="hidden" name="objectId" value={decisionId} />
      <h3 className="text-sm font-semibold text-muted">Record an outcome</h3>

      <label className="block">
        <span className="text-xs font-medium text-muted">What happened?</span>
        <textarea
          name="outcomeSummary"
          required
          rows={2}
          maxLength={2000}
          className="mt-1 w-full rounded-lg border border-hairline bg-surface p-2 text-sm text-ink placeholder:text-faint"
          aria-invalid={Boolean(fieldErrors.outcomeSummary)}
        />
        <FieldError message={fieldErrors.outcomeSummary} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-muted">Success score (0-100)</span>
          <input
            name="successScore"
            type="number"
            min={0}
            max={100}
            className="mt-1 w-full rounded-lg border border-hairline bg-surface p-2 text-sm text-ink placeholder:text-faint"
            aria-invalid={Boolean(fieldErrors.successScore)}
          />
          <FieldError message={fieldErrors.successScore} />
        </label>
        <label className="flex items-center gap-2 sm:mt-6">
          <input name="followUpRequired" type="checkbox" />
          <span className="text-xs font-medium text-muted">Follow-up required</span>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-muted">Lesson learned</span>
        <textarea
          name="lessonLearned"
          rows={2}
          maxLength={2000}
          className="mt-1 w-full rounded-lg border border-hairline bg-surface p-2 text-sm text-ink placeholder:text-faint"
          aria-invalid={Boolean(fieldErrors.lessonLearned)}
        />
        <FieldError message={fieldErrors.lessonLearned} />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-[#06080f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save outcome"}
      </button>
    </form>
  );
}
