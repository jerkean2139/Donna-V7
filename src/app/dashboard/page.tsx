import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { WelcomeBriefing } from "@/components/welcome-briefing";
import { cognitiveGraphRepository, cognitiveObjectRepository } from "@/lib/repositories";
import { listTenantCognitiveObjects } from "@/lib/cognitive-object/service";
import { computeDashboardMetrics } from "@/lib/dashboard/metrics";
import type { BriefingObject } from "@/lib/dashboard/briefing";

export default async function DashboardPage() {
  const tenant = await tryGetTenantContext();

  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  const [objects, edges, user] = await Promise.all([
    listTenantCognitiveObjects(cognitiveObjectRepository, tenant.tenantId),
    cognitiveGraphRepository.listByTenant(tenant.tenantId),
    currentUser(),
  ]);

  const metrics = computeDashboardMetrics(objects, edges);

  // Serialize the newest objects for the client-side welcome briefing. It
  // computes "since your last visit" deltas against a localStorage timestamp,
  // so it needs the raw createdAt of recent objects.
  const briefingObjects: BriefingObject[] = objects.slice(0, 30).map((object) => ({
    id: object.id,
    title: object.title,
    objectType: object.objectType,
    status: object.status,
    riskLevel: object.riskLevel,
    createdAt: object.createdAt.toISOString(),
  }));
  const firstName = user?.firstName ?? null;

  const tiles = [
    { label: "Open Objects", value: metrics.openObjects },
    { label: "Approvals Needed", value: metrics.approvalsNeeded },
    { label: "Graph Links", value: metrics.graphLinks },
    { label: "Total Objects", value: metrics.totalObjects },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-slate-700">
            A live view of this workspace&apos;s Cognitive Objects, approvals, and graph links.
          </p>
        </div>
        <Link className="rounded-lg bg-slate-950 px-5 py-3 text-white" href="/cognitive-objects/new">
          New object
        </Link>
      </div>

      <WelcomeBriefing
        tenantId={tenant.tenantId}
        userName={firstName}
        objects={briefingObjects}
        approvalsNeeded={metrics.approvalsNeeded}
        graphLinks={metrics.graphLinks}
      />

      <section aria-label="Workspace metrics" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500">{tile.label}</h2>
            <p className="mt-2 text-3xl font-bold text-slate-950">{tile.value}</p>
          </div>
        ))}
      </section>

      {metrics.totalObjects === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-slate-700">
          No Cognitive Objects yet.{" "}
          <Link className="font-semibold underline" href="/cognitive-objects/new">
            Create the first one
          </Link>{" "}
          to start populating the dashboard.
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-950">Recent objects</h2>
              <Link className="text-sm text-slate-500 hover:text-slate-900" href="/cognitive-objects">
                View all
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-slate-100">
              {metrics.recentObjects.map((object) => (
                <li key={object.id}>
                  <Link
                    href={`/cognitive-objects/${object.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:opacity-80"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">{object.title}</span>
                      <span className="text-xs text-slate-500 capitalize">
                        {object.objectType} · {object.status.replace(/_/g, " ")}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-700">
                      {object.riskLevel} risk
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-950">By type</h2>
            <ul className="mt-4 space-y-2">
              {metrics.byType.map((entry) => (
                <li key={entry.type} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-700">{entry.type}</span>
                  <span className="font-semibold text-slate-950">{entry.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
