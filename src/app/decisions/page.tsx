import Link from "next/link";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
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
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Decision Objects</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">
            Structured records of how meaningful decisions were understood, analyzed, approved,
            and learned from.
          </p>
        </div>
        <Link className="rounded-lg bg-cyan px-5 py-3 text-bg-base" href="/decisions/new">
          New decision
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {decisions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-default p-8 text-text-secondary">
            No Decision Objects yet.{" "}
            <Link className="font-semibold underline" href="/decisions/new">
              Create your first decision
            </Link>
            .
          </div>
        ) : (
          decisions.map((decision) => (
            <Link
              key={decision.id}
              href={`/decisions/${decision.id}`}
              className="block rounded-xl border border-border-default p-5 hover:bg-bg-surface-2"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold text-text-primary">{decision.title}</h2>
                <span className="shrink-0 rounded-full bg-bg-surface-2 px-3 py-1 text-xs capitalize text-text-secondary">
                  {decision.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                {decision.objective ?? decision.summary ?? "No objective set yet."}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
