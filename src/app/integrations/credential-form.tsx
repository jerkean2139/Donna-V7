"use client";

import { useActionState } from "react";
import { idleFormState } from "@/lib/forms";
import type { IntegrationProvider } from "@/lib/integrations/credentials/types";
import { deleteIntegrationCredentialAction, setIntegrationCredentialAction } from "./actions";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-sm text-red-600" role="alert">
      {message}
    </p>
  );
}

interface CredentialFormProps {
  provider: IntegrationProvider;
  configured: boolean;
}

export function CredentialForm({ provider, configured }: CredentialFormProps) {
  const [state, formAction, isPending] = useActionState(setIntegrationCredentialAction, idleFormState);
  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <div className="space-y-3">
      {state.status === "error" && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
          aria-live="polite"
        >
          {state.message}
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3" aria-busy={isPending}>
        <input type="hidden" name="provider" value={provider} />
        <label className="flex-1">
          <span className="text-xs font-medium text-slate-600">
            {configured ? "Replace API key" : "API key"}
          </span>
          <input
            name="secret"
            type="password"
            required
            autoComplete="off"
            placeholder={configured ? "•••••••••••••• (already set)" : "Paste your API key"}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            aria-invalid={Boolean(fieldErrors.secret)}
          />
          <FieldError message={fieldErrors.secret} />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : configured ? "Replace" : "Save"}
        </button>
      </form>

      {configured && (
        <form action={deleteIntegrationCredentialAction}>
          <input type="hidden" name="provider" value={provider} />
          <button type="submit" className="text-sm text-red-600 hover:text-red-800">
            Remove credential
          </button>
        </form>
      )}
    </div>
  );
}
