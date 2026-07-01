import Link from "next/link";
import { getTenantContext } from "@/lib/auth/tenant";
import { cognitiveObjectRepository } from "@/lib/repositories";
import { listTenantDecisionObjects } from "@/lib/decision/service";

export default async function DecisionsPage() {
  const tenant = await getTenantContext();
  const decisions = await listTenantDecisionObjects(cognitiveObjectRepository, tenant.tenantId);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Decision Objects</h1>
          <p className="mt-3 max-w-2xl text-slate-700">
            Structured records of how meaningful decisions were understood, analyzed, approved,
            and learned from.
          </p>
        </div>
        <Link className="rounded-lg bg-slate-950 px-5 py-3 text-white" href="/cognitive-objects/new">
          New object
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {decisions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-slate-700">
            No Decision Objects yet. Create a Cognitive Object with type{" "}
            <span className="font-semibold">decision</span> to start one.
          </div>
        ) : (
          decisions.map((decision) => (
            <Link
              key={decision.id}
              href={`/decisions/${decision.id}`}
              className="block rounded-xl border border-slate-200 p-5 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold text-slate-900">{decision.title}</h2>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-700">
                  {decision.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {decision.objective ?? decision.summary ?? "No objective set yet."}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
