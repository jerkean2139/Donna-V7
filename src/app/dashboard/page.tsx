import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { WelcomeBriefing } from "@/components/welcome-briefing";
import { RiskBadge, StatusBadge } from "@/components/badges";
import { CountUp } from "@/components/count-up";
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
    { label: "Open Objects", value: metrics.openObjects, accent: "text-cyan-300" },
    { label: "Approvals Needed", value: metrics.approvalsNeeded, accent: "text-amber-300" },
    { label: "Graph Links", value: metrics.graphLinks, accent: "text-violet-300" },
    { label: "Total Objects", value: metrics.totalObjects, accent: "text-ink" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="donna-reveal flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Workspace</p>
          <h1 className="donna-display mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-muted">
            A live view of this workspace&apos;s Cognitive Objects, approvals, and graph links.
          </p>
        </div>
        <Link
          className="donna-card-hover shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 px-5 py-3 font-semibold text-[#06080f] shadow-[0_10px_30px_-10px_rgba(34,211,238,0.6)]"
          href="/cognitive-objects/new"
        >
          New object
        </Link>
      </div>

      <div className="donna-reveal" style={{ animationDelay: "80ms" }}>
        <WelcomeBriefing
          tenantId={tenant.tenantId}
          userName={firstName}
          objects={briefingObjects}
          approvalsNeeded={metrics.approvalsNeeded}
          graphLinks={metrics.graphLinks}
        />
      </div>

      <section aria-label="Workspace metrics" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile, index) => (
          <div
            key={tile.label}
            className="donna-card donna-card-hover donna-reveal rounded-2xl p-5"
            style={{ animationDelay: `${140 + index * 70}ms` }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">{tile.label}</h2>
            <p className={`mt-2 text-4xl font-bold tabular-nums ${tile.accent}`}>
              <CountUp value={tile.value} />
            </p>
          </div>
        ))}
      </section>

      {metrics.totalObjects === 0 ? (
        <div className="donna-card donna-reveal mt-8 rounded-2xl border-dashed p-8 text-muted" style={{ animationDelay: "360ms" }}>
          No Cognitive Objects yet.{" "}
          <Link className="font-semibold text-accent underline" href="/cognitive-objects/new">
            Create the first one
          </Link>{" "}
          to start populating the dashboard.
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section
            className="donna-card donna-reveal rounded-2xl p-5 lg:col-span-2"
            style={{ animationDelay: "360ms" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">Recent objects</h2>
              <Link className="text-sm text-muted transition-colors hover:text-ink" href="/cognitive-objects">
                View all
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-hairline">
              {metrics.recentObjects.map((object) => (
                <li key={object.id}>
                  <Link
                    href={`/cognitive-objects/${object.id}`}
                    className="group flex items-center justify-between gap-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink transition-colors group-hover:text-accent">
                        {object.title}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-xs text-faint capitalize">
                        {object.objectType} <StatusBadge status={object.status} />
                      </span>
                    </span>
                    <span className="shrink-0">
                      <RiskBadge level={object.riskLevel} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="donna-card donna-reveal rounded-2xl p-5"
            style={{ animationDelay: "430ms" }}
          >
            <h2 className="font-semibold text-ink">By type</h2>
            <ul className="mt-4 space-y-3">
              {metrics.byType.map((entry) => {
                const pct = metrics.totalObjects ? Math.round((entry.count / metrics.totalObjects) * 100) : 0;
                return (
                  <li key={entry.type}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize text-muted">{entry.type}</span>
                      <span className="font-semibold text-ink tabular-nums">{entry.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
