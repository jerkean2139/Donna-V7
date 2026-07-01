import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant";
import { cognitiveObjectRepository } from "@/lib/cognitive-object/repository";
import { getTenantCognitiveObject } from "@/lib/cognitive-object/service";
import { evaluateCognitiveObjectGovernance, defaultTenantGovernancePolicy } from "@/lib/cognitive-object/governance";
import { cognitiveGraphRepository } from "@/lib/cognitive-graph/repository";
import { listCognitiveGraphEdgesForObject } from "@/lib/cognitive-graph/service";
import { isHighTrustRelationship } from "@/lib/cognitive-graph/policy";

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
        <h2 className="font-semibold">Body</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {object.body ?? "No body content."}
        </p>
      </section>
    </main>
  );
}
