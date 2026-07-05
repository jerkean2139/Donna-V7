"use client";

import { useActionState } from "react";
import { riskLevels } from "@/lib/cognitive-object/types";
import { idleFormState } from "@/lib/forms";
import { createDecisionAction } from "../actions";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-rose-300" role="alert">{message}</p>;
}

export function CreateDecisionForm() {
  const [state, formAction, isPending] = useActionState(createDecisionAction, idleFormState);
  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="mt-8 space-y-6" aria-busy={isPending}>
      {state.status === "error" && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200" role="alert" aria-live="polite">
          {state.message}
        </div>
      )}

      <label className="block">
        <span className="text-sm font-medium">Title</span>
        <input
          name="title"
          required
          minLength={3}
          maxLength={180}
          placeholder="Choose MVP deployment architecture"
          className="mt-2 w-full rounded-lg border border-hairline bg-surface p-3 text-ink placeholder:text-faint"
          aria-invalid={Boolean(fieldErrors.title)}
        />
        <FieldError message={fieldErrors.title} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Objective</span>
        <span className="ml-2 text-xs text-faint">What are you trying to accomplish?</span>
        <textarea
          name="objective"
          required
          rows={3}
          maxLength={2000}
          placeholder="Decide how to deploy the Manumation Intelligence Layer MVP."
          className="mt-2 w-full rounded-lg border border-hairline bg-surface p-3 text-ink placeholder:text-faint"
          aria-invalid={Boolean(fieldErrors.objective)}
        />
        <FieldError message={fieldErrors.objective} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Summary</span>
        <textarea
          name="summary"
          rows={3}
          maxLength={1000}
          className="mt-2 w-full rounded-lg border border-hairline bg-surface p-3 text-ink placeholder:text-faint"
          aria-invalid={Boolean(fieldErrors.summary)}
        />
        <FieldError message={fieldErrors.summary} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Risk level</span>
        <select name="riskLevel" className="mt-2 w-full rounded-lg border border-hairline bg-surface p-3 text-ink placeholder:text-faint">
          {riskLevels.map((risk) => (
            <option key={risk} value={risk}>
              {risk}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors.riskLevel} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Tags, comma separated</span>
        <input
          name="tags"
          maxLength={2000}
          className="mt-2 w-full rounded-lg border border-hairline bg-surface p-3 text-ink placeholder:text-faint"
          aria-invalid={Boolean(fieldErrors.tags)}
        />
        <FieldError message={fieldErrors.tags} />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 px-5 py-3 font-semibold text-[#06080f] shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create decision"}
      </button>
    </form>
  );
}
