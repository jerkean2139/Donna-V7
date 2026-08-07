"use client";

import { useActionState } from "react";
import { relationshipTypes } from "@/lib/cognitive-object/types";
import { idleFormState } from "@/lib/forms";
import { createRelationshipAction } from "../actions";

interface RelationshipCandidate {
  id: string;
  title: string;
  objectType: string;
}

interface RelationshipFormProps {
  fromObjectId: string;
  candidates: RelationshipCandidate[];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-rose-300" role="alert">{message}</p>;
}

export function RelationshipForm({ fromObjectId, candidates }: RelationshipFormProps) {
  const [state, formAction, isPending] = useActionState(createRelationshipAction, idleFormState);
  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="mt-8 space-y-6" aria-busy={isPending}>
      {state.status === "error" && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200" role="alert" aria-live="polite">
          {state.message}
        </div>
      )}

      <input type="hidden" name="fromObjectId" value={fromObjectId} />

      <label className="block">
        <span className="text-sm font-medium">Related object</span>
        <select
          name="toObjectId"
          required
          className="mt-2 w-full rounded-lg border border-hairline bg-surface p-3 text-ink placeholder:text-faint"
          aria-invalid={Boolean(fieldErrors.toObjectId)}
          defaultValue=""
        >
          <option value="" disabled>
            Choose a Cognitive Object…
          </option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.title} ({candidate.objectType})
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors.toObjectId} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Relationship type</span>
        <select
          name="relationshipType"
          className="mt-2 w-full rounded-lg border border-hairline bg-surface p-3 text-ink placeholder:text-faint"
          aria-invalid={Boolean(fieldErrors.relationshipType)}
        >
          {relationshipTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors.relationshipType} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Strength (0–100)</span>
        <input
          name="strength"
          type="number"
          min={0}
          max={100}
          step={1}
          defaultValue={60}
          className="mt-2 w-full rounded-lg border border-hairline bg-surface p-3 text-ink placeholder:text-faint"
          aria-invalid={Boolean(fieldErrors.strength)}
        />
        <FieldError message={fieldErrors.strength} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Evidence summary (optional)</span>
        <textarea
          name="evidenceSummary"
          rows={3}
          maxLength={2000}
          className="mt-2 w-full rounded-lg border border-hairline bg-surface p-3 text-ink placeholder:text-faint"
          aria-invalid={Boolean(fieldErrors.evidenceSummary)}
        />
        <FieldError message={fieldErrors.evidenceSummary} />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 px-5 py-3 font-semibold text-[#06080f] shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create relationship"}
      </button>
    </form>
  );
}
