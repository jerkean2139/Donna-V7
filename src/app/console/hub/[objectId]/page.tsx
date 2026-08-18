import Link from "next/link";
import { notFound } from "next/navigation";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { RiskBadge, StatusBadge } from "@/components/badges";
import { getTenantCognitiveObject } from "@/lib/cognitive-object/service";
import {
  agentRunRepository,
  cognitiveObjectRepository,
  proposedActionRepository,
} from "@/lib/repositories";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import { ArtifactCard } from "./artifacts";

interface WorkHubPageProps {
  params: Promise<{ objectId: string }>;
}

export default async function WorkHubPage({ params }: WorkHubPageProps) {
  const { objectId } = await params;
  const tenant = await tryGetTenantContext();

  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  const object = await getTenantCognitiveObject(cognitiveObjectRepository, objectId, tenant.tenantId);
  if (!object) {
    notFound();
  }

  const [agentRuns, proposedActions] = await Promise.all([
    agentRunRepository.listByObjectForTenant(object.id, tenant.tenantId),
    proposedActionRepository.listByObjectForTenant(object.id, tenant.tenantId),
  ]);

  const latestRun = agentRuns[0] ?? null;
  const agentName = latestRun?.agentName ?? null;
  const department = agentName ? AGENT_REGISTRY[agentName]?.department : null;
  const pending = proposedActions.filter((action) => action.status === "proposed");

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link className="text-sm text-muted transition-colors hover:text-ink" href="/console">
        ← Back to Donna
      </Link>

      <div className="donna-reveal mt-4">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Work Hub</p>
          {agentName && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-cyan-200 ring-1 ring-inset ring-cyan-400/25">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> {agentName}
              {department ? <span className="text-faint">· {department}</span> : null}
            </span>
          )}
        </div>
        <h1 className="donna-display mt-2 text-3xl font-bold tracking-tight">{object.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={object.status} />
          <RiskBadge level={object.riskLevel} />
          <Link
            href={`/cognitive-objects/${object.id}`}
            className="text-xs text-muted underline transition-colors hover:text-ink"
          >
            Full object
          </Link>
        </div>
        {object.objective && <p className="mt-4 text-muted">{object.objective}</p>}
      </div>

      {/* What the agent said */}
      {latestRun?.responseText && (
        <section className="donna-card donna-reveal mt-6 rounded-2xl p-5" style={{ animationDelay: "60ms" }}>
          <h2 className="text-sm font-semibold text-ink">{agentName}&apos;s summary</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{latestRun.responseText}</p>

          {latestRun.toolCalls.filter((call) => call.kind === "read").length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-faint">What it looked at</p>
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {latestRun.toolCalls
                  .filter((call) => call.kind === "read")
                  .map((call, index) => (
                    <li key={index}>
                      <span className="font-mono text-faint">{call.toolName}</span> — {call.resultSummary}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Artifacts — the things the agent created, awaiting your call */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Artifacts</h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-400/12 px-2.5 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-400/30">
              {pending.length} awaiting approval
            </span>
          )}
        </div>

        {proposedActions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {latestRun
              ? `${agentName} completed this with no side-effecting actions to approve.`
              : "No agent has worked in this hub yet."}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {proposedActions.map((action) => (
              <ArtifactCard key={action.id} action={action} objectId={object.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
