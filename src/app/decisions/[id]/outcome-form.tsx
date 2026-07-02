"use client";

import { useActionState } from "react";
import { idleFormState } from "@/lib/forms";
import { recordDecisionOutcomeAction } from "./actions";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600" role="alert">{message}</p>;
}

export function OutcomeForm({ decisionId }: { decisionId: string }) {
  const [state, formAction, isPending] = useActionState(recordDecisionOutcomeAction, idleFormState);
  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4" aria-busy={isPending}>
      {state.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert" aria-live="polite">
          {state.message}
        </div>
      )}

      <input type="hidden" name="objectId" value={decisionId} />
      <h3 className="text-sm font-semibold text-slate-700">Record an outcome</h3>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">What happened?</span>
        <textarea
          name="outcomeSummary"
          required
          rows={2}
          maxLength={2000}
          className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
          aria-invalid={Boolean(fieldErrors.outcomeSummary)}
        />
        <FieldError message={fieldErrors.outcomeSummary} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Success score (0-100)</span>
          <input
            name="successScore"
            type="number"
            min={0}
            max={100}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
            aria-invalid={Boolean(fieldErrors.successScore)}
          />
          <FieldError message={fieldErrors.successScore} />
        </label>
        <label className="flex items-center gap-2 sm:mt-6">
          <input name="followUpRequired" type="checkbox" />
          <span className="text-xs font-medium text-slate-600">Follow-up required</span>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">Lesson learned</span>
        <textarea
          name="lessonLearned"
          rows={2}
          maxLength={2000}
          className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
          aria-invalid={Boolean(fieldErrors.lessonLearned)}
        />
        <FieldError message={fieldErrors.lessonLearned} />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save outcome"}
      </button>
    </form>
  );
}
