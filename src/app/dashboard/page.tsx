import Link from "next/link";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { cognitiveGraphRepository, cognitiveObjectRepository } from "@/lib/repositories";
import { listTenantCognitiveObjects } from "@/lib/cognitive-object/service";
import {
  defaultTenantGovernancePolicy,
  evaluateCognitiveObjectGovernance,
} from "@/lib/cognitive-object/governance";

const CLOSED_STATUSES = new Set(["executed", "archived"]);

export default async function DashboardPage() {
  const tenant = await tryGetTenantContext();

  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  const [objects, graphLinkCount] = await Promise.all([
    listTenantCognitiveObjects(cognitiveObjectRepository, tenant.tenantId),
    cognitiveGraphRepository.countEdgesForTenant(tenant.tenantId),
  ]);

  const openObjects = objects.filter((object) => !CLOSED_STATUSES.has(object.status));
  const approvalsNeeded = openObjects.filter(
    (object) =>
      evaluateCognitiveObjectGovernance(object, defaultTenantGovernancePolicy).approvalRequired,
  );
  const recentObjects = objects.slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
      <p className="mt-3 max-w-2xl text-slate-700">
        A live view of this workspace&apos;s Cognitive Objects, approvals, and graph connections.
      </p>

      <section aria-label="Workspace metrics" className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold">Open Objects</h2>
          <p className="mt-2 text-3xl font-bold">{openObjects.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold">Approvals Needed</h2>
          <p className="mt-2 text-3xl font-bold">{approvalsNeeded.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold">Graph Links</h2>
          <p className="mt-2 text-3xl font-bold">{graphLinkCount}</p>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">Recent Cognitive Objects</h2>
          <Link className="text-sm font-medium underline" href="/cognitive-objects">
            View all
          </Link>
        </div>

        {recentObjects.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-slate-700">
            Nothing captured yet.{" "}
            <Link className="font-medium underline" href="/cognitive-objects/new">
              Create the first Cognitive Object
            </Link>{" "}
            to light up this dashboard.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {recentObjects.map((object) => (
              <li key={object.id}>
                <Link
                  href={`/cognitive-objects/${object.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <span className="font-medium">{object.title}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">{object.objectType}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">{object.status.replace(/_/g, " ")}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">Risk: {object.riskLevel}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
