import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant";
import {
  cognitiveObjectRepository,
  evolutionLoopRunRepository,
  outcomeRepository,
} from "@/lib/repositories";
import { getDecisionObjectForTenant } from "@/lib/decision/service";
import { recordDecisionOutcomeAction } from "./actions";

interface DecisionDetailPageProps {
  params: Promise<{ id: string }>;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

export default async function DecisionDetailPage({ params }: DecisionDetailPageProps) {
  const { id } = await params;
  const tenant = await getTenantContext();
  const decision = await getDecisionObjectForTenant(
    cognitiveObjectRepository,
    evolutionLoopRunRepository,
    id,
    tenant.tenantId,
    outcomeRepository,
  );

  if (!decision) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link className="text-sm text-slate-500 hover:text-slate-900" href="/decisions">
        ← All decisions
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">{decision.title}</h1>
        <div className="flex shrink-0 gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-700">
            {decision.status.replace(/_/g, " ")}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-700">
            {decision.riskLevel} risk
          </span>
        </div>
      </div>

      {decision.approvalRequired && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="font-semibold">Human approval required.</span>{" "}
          {decision.approvalReason ?? "This decision meets the tenant's approval threshold."}
        </div>
      )}

      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Objective" value={decision.objective} />
        </div>
        <Field label="Hidden goal" value={decision.hiddenGoal} />
        <Field
          label="Confidence"
          value={decision.confidenceScore != null ? `${decision.confidenceScore}/100` : null}
        />
        <div className="sm:col-span-2">
          <Field label="Context summary" value={decision.contextSummary} />
        </div>
        <div className="sm:col-span-2">
          <Field label="Recommendation" value={decision.recommendation} />
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="font-semibold text-slate-950">
          Assumptions{" "}
          <span className="text-sm font-normal text-slate-500">({decision.assumptions.length})</span>
        </h2>
        {decision.assumptions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No assumptions recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {decision.assumptions.map((assumption, index) => (
              <li key={index} className="rounded-lg border border-slate-200 p-3 text-sm">
                <span className="text-slate-900">{assumption.text}</span>
                <span className="ml-2 text-xs capitalize text-slate-500">
                  {assumption.riskLevel} risk
                  {assumption.needsVerification ? " · needs verification" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-slate-950">
          Options considered{" "}
          <span className="text-sm font-normal text-slate-500">
            ({decision.optionsConsidered.length})
          </span>
        </h2>
        {decision.optionsConsidered.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No options recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {decision.optionsConsidered.map((option, index) => (
              <li key={index} className="rounded-lg border border-slate-200 p-3 text-sm">
                <span className="font-medium text-slate-900">{option.name}</span>
                <p className="mt-1 text-slate-600">{option.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-slate-950">
          Outcomes &amp; lessons{" "}
          <span className="text-sm font-normal text-slate-500">({decision.outcomes.length})</span>
        </h2>
        {decision.outcomes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No outcomes recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {decision.outcomes.map((outcome) => (
              <li key={outcome.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-900">{outcome.outcomeSummary}</span>
                  {outcome.successScore != null && (
                    <span className="shrink-0 text-xs text-slate-500">
                      success {outcome.successScore}/100
                    </span>
                  )}
                </div>
                {outcome.lessonLearned && (
                  <p className="mt-1 text-slate-600">Lesson: {outcome.lessonLearned}</p>
                )}
                {outcome.followUpRequired && (
                  <p className="mt-1 text-xs font-medium text-amber-700">Follow-up required</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <form action={recordDecisionOutcomeAction} className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4">
          <input type="hidden" name="objectId" value={decision.id} />
          <h3 className="text-sm font-semibold text-slate-700">Record an outcome</h3>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">What happened?</span>
            <textarea
              name="outcomeSummary"
              required
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
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
              />
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
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </label>
          <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white">
            Save outcome
          </button>
        </form>
      </section>

      <p className="mt-10 text-xs text-slate-400">
        {decision.loopRunCount === 0
          ? "No Evolution Loop has been run for this decision yet."
          : `Reasoning reflects the latest of ${decision.loopRunCount} Evolution Loop run(s).`}
      </p>
    </main>
  );
}
