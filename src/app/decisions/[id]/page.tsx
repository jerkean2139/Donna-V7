import Link from "next/link";
import { notFound } from "next/navigation";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { RiskBadge, StatusBadge } from "@/components/badges";
import {
  cognitiveObjectRepository,
  evolutionLoopRunRepository,
  outcomeRepository,
} from "@/lib/repositories";
import { getDecisionObjectForTenant } from "@/lib/decision/service";
import { OutcomeForm } from "./outcome-form";

interface DecisionDetailPageProps {
  params: Promise<{ id: string }>;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-faint">{label}</dt>
      <dd className="mt-1 text-ink">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

export default async function DecisionDetailPage({ params }: DecisionDetailPageProps) {
  const { id } = await params;
  const tenant = await tryGetTenantContext();

  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

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
      <Link className="text-sm text-muted transition-colors hover:text-ink" href="/decisions">
        ← All decisions
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{decision.title}</h1>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <StatusBadge status={decision.status} />
          <RiskBadge level={decision.riskLevel} />
        </div>
      </div>

      {decision.approvalRequired && (
        <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
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
        <h2 className="font-semibold text-ink">
          Assumptions{" "}
          <span className="text-sm font-normal text-faint">({decision.assumptions.length})</span>
        </h2>
        {decision.assumptions.length === 0 ? (
          <p className="mt-2 text-sm text-faint">No assumptions recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {decision.assumptions.map((assumption, index) => (
              <li key={index} className="rounded-lg border border-hairline p-3 text-sm">
                <span className="text-ink">{assumption.text}</span>
                <span className="ml-2 text-xs capitalize text-faint">
                  {assumption.riskLevel} risk
                  {assumption.needsVerification ? " · needs verification" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-ink">
          Options considered{" "}
          <span className="text-sm font-normal text-faint">
            ({decision.optionsConsidered.length})
          </span>
        </h2>
        {decision.optionsConsidered.length === 0 ? (
          <p className="mt-2 text-sm text-faint">No options recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {decision.optionsConsidered.map((option, index) => (
              <li key={index} className="rounded-lg border border-hairline p-3 text-sm">
                <span className="font-medium text-ink">{option.name}</span>
                <p className="mt-1 text-muted">{option.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-ink">
          Outcomes &amp; lessons{" "}
          <span className="text-sm font-normal text-faint">({decision.outcomes.length})</span>
        </h2>
        {decision.outcomes.length === 0 ? (
          <p className="mt-2 text-sm text-faint">No outcomes recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {decision.outcomes.map((outcome) => (
              <li key={outcome.id} className="rounded-lg border border-hairline p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink">{outcome.outcomeSummary}</span>
                  {outcome.successScore != null && (
                    <span className="shrink-0 text-xs text-faint">
                      success {outcome.successScore}/100
                    </span>
                  )}
                </div>
                {outcome.lessonLearned && (
                  <p className="mt-1 text-muted">Lesson: {outcome.lessonLearned}</p>
                )}
                {outcome.followUpRequired && (
                  <p className="mt-1 text-xs font-medium text-amber-700">Follow-up required</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <OutcomeForm decisionId={decision.id} />
      </section>

      <p className="mt-10 text-xs text-slate-400">
        {decision.loopRunCount === 0
          ? "No Evolution Loop has been run for this decision yet."
          : `Reasoning reflects the latest of ${decision.loopRunCount} Evolution Loop run(s).`}
      </p>
    </main>
  );
}
