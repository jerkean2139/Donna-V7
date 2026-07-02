"use client";

import { useActionState } from "react";
import { cognitiveObjectTypes, riskLevels } from "@/lib/cognitive-object/types";
import { idleFormState } from "@/lib/forms";
import { createCognitiveObjectAction } from "../actions";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600" role="alert">{message}</p>;
}

export function CreateObjectForm() {
  const [state, formAction, isPending] = useActionState(createCognitiveObjectAction, idleFormState);
  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="mt-8 space-y-6" aria-busy={isPending}>
      {state.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert" aria-live="polite">
          {state.message}
        </div>
      )}

      <label className="block">
        <span className="text-sm font-medium">Type</span>
        <select name="objectType" className="mt-2 w-full rounded-lg border border-slate-300 p-3">
          {cognitiveObjectTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <FieldError message={fieldErrors.objectType} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Title</span>
        <input
          name="title"
          required
          minLength={3}
          maxLength={180}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          aria-invalid={Boolean(fieldErrors.title)}
        />
        <FieldError message={fieldErrors.title} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Objective</span>
        <span className="ml-2 text-xs text-slate-500">What are you trying to accomplish? (decisions)</span>
        <textarea
          name="objective"
          rows={2}
          maxLength={2000}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3"
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
          className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          aria-invalid={Boolean(fieldErrors.summary)}
        />
        <FieldError message={fieldErrors.summary} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Body</span>
        <textarea
          name="body"
          rows={8}
          maxLength={20000}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          aria-invalid={Boolean(fieldErrors.body)}
        />
        <FieldError message={fieldErrors.body} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Risk level</span>
        <select name="riskLevel" className="mt-2 w-full rounded-lg border border-slate-300 p-3">
          {riskLevels.map((risk) => (
            <option key={risk} value={risk}>{risk}</option>
          ))}
        </select>
        <FieldError message={fieldErrors.riskLevel} />
      </label>

      <input type="hidden" name="source" value="manual" />

      <label className="block">
        <span className="text-sm font-medium">Tags, comma separated</span>
        <input
          name="tags"
          maxLength={2000}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          aria-invalid={Boolean(fieldErrors.tags)}
        />
        <FieldError message={fieldErrors.tags} />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-slate-950 px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create object"}
      </button>
    </form>
  );
}
