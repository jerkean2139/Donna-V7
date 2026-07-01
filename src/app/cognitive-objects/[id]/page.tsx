import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant";
import {
  cognitiveObjectRepository,
  cognitiveGraphRepository,
  evolutionLoopRunRepository,
} from "@/lib/repositories";
import { getTenantCognitiveObject } from "@/lib/cognitive-object/service";
import { evaluateCognitiveObjectGovernance, defaultTenantGovernancePolicy } from "@/lib/cognitive-object/governance";
import { listCognitiveGraphEdgesForObject } from "@/lib/cognitive-graph/service";
import { isHighTrustRelationship } from "@/lib/cognitive-graph/policy";
import { listEvolutionLoopRunsForObject } from "@/lib/evolution-loop/service";
import { RELEASE_READY_SCORE } from "@/lib/evolution-loop/types";
import { startEvolutionLoopAction } from "../actions";

interface CognitiveObjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CognitiveObjectDetailPage({ params }: CognitiveObjectDetailPageProps) {
  const { id } = await params;
  const tenant = await getTenantContext();
  const object = await getTenantCognitiveObject(cognitiveObjectRepository, id, tenant.tenantId);

  if (!object) {
    notFound();
  }

  const governance = evaluateCognitiveObjectGovernance(object, defaultTenantGovernancePolicy);
  const relationships = await listCognitiveGraphEdgesForObject(
    cognitiveGraphRepository,
    object.id,
    tenant.tenantId,
  );
  const loopRuns = await listEvolutionLoopRunsForObject(evolutionLoopRunRepository, {
    objectId: object.id,
    tenantId: tenant.tenantId,
  });
  const latestRun = loopRuns[0] ?? null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-700">
          {object.objectType}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-700">
          Risk: {object.riskLevel}
        </span>
      </div>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{object.title}</h1>
      <p className="mt-4 text-slate-700">{object.summary ?? "No summary provided."}</p>

      <section className="mt-8 rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold">Governance</h2>
        <p className="mt-2 text-sm text-slate-700">
          Approval required: {governance.approvalRequired ? "Yes" : "No"}
        </p>
        {governance.reasons.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {governance.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Graph Relationships</h2>
          <Link className="text-sm font-medium text-slate-950 underline" href={`/cognitive-objects/${object.id}/relationships/new`}>
            Add relationship
          </Link>
        </div>

        {relationships.length === 0 ? (
          <p className="mt-3 text-sm text-slate-700">No graph relationships yet.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            {relationships.map((edge) => (
              <li key={edge.id} className="rounded-lg bg-slate-50 p-3">
                <p className="font-medium">{edge.relationshipType}</p>
                <p className="mt-1">Strength: {edge.strength}</p>
                <p className="mt-1">High trust: {isHighTrustRelationship(edge) ? "Yes" : "No"}</p>
                {edge.evidenceSummary && <p className="mt-1">Evidence: {edge.evidenceSummary}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Evolution Loop</h2>
            <p className="mt-2 text-sm text-slate-700">
              {latestRun
                ? `Latest run scored ${latestRun.releaseScore ?? 0}/${RELEASE_READY_SCORE} release target.`
                : "No loop runs yet for this object."}
            </p>
          </div>

          <form action={startEvolutionLoopAction}>
            <input type="hidden" name="objectId" value={object.id} />
            <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white">
              Start loop
            </button>
          </form>
        </div>

        {latestRun && (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Confidence</p>
                <p className="mt-1 text-2xl font-semibold">{latestRun.confidenceScore ?? 0}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Release score</p>
                <p className="mt-1 text-2xl font-semibold">{latestRun.releaseScore ?? 0}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Approval</p>
                <p className="mt-1 text-sm font-semibold">
                  {latestRun.approvalRequired ? "Required" : "Not required"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Recommendation</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {latestRun.recommendation ?? "No recommendation recorded."}
              </p>
              {latestRun.approvalReason && (
                <p className="mt-2 text-sm text-slate-600">{latestRun.approvalReason}</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold">Run history</h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-700">
                {loopRuns.map((run) => (
                  <li key={run.id} className="flex flex-wrap justify-between gap-3 rounded-lg bg-slate-50 p-3">
                    <span>{run.createdAt.toLocaleString()}</span>
                    <span>
                      confidence {run.confidenceScore ?? 0} / release {run.releaseScore ?? 0}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold">Body</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {object.body ?? "No body content."}
        </p>
      </section>
    </main>
  );
}
