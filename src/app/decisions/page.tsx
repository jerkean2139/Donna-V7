import Link from "next/link";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { StatusBadge } from "@/components/badges";
import { cognitiveObjectRepository } from "@/lib/repositories";
import { listTenantDecisionObjects } from "@/lib/decision/service";

export default async function DecisionsPage() {
  const tenant = await tryGetTenantContext();

  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  const decisions = await listTenantDecisionObjects(cognitiveObjectRepository, tenant.tenantId);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="donna-reveal flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Decision history</p>
          <h1 className="donna-display mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Decisions</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Structured records of how meaningful decisions were understood, analyzed, approved,
            and learned from.
          </p>
        </div>
        <Link className="donna-card-hover shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 px-5 py-3 font-semibold text-[#06080f] shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)]" href="/decisions/new">
          New decision
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {decisions.length === 0 ? (
          <div className="donna-card rounded-2xl border-dashed p-8 text-muted">
            No Decision Objects yet.{" "}
            <Link className="font-semibold text-accent underline" href="/decisions/new">
              Create your first decision
            </Link>
            .
          </div>
        ) : (
          decisions.map((decision) => (
            <Link
              key={decision.id}
              href={`/decisions/${decision.id}`}
              className="donna-card donna-card-hover block rounded-2xl p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold text-ink">{decision.title}</h2>
                <span className="shrink-0">
                  <StatusBadge status={decision.status} />
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {decision.objective ?? decision.summary ?? "No objective set yet."}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
