import Link from "next/link";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import {
  agentRunRepository,
  cognitiveGraphRepository,
  cognitiveObjectRepository,
  proposedActionRepository,
} from "@/lib/repositories";
import { listTenantCognitiveObjects } from "@/lib/cognitive-object/service";
import { computeDashboardMetrics } from "@/lib/dashboard/metrics";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import {
  computeDepartmentActivity,
  computeGovernanceActivity,
} from "@/lib/dashboard/mission-control";
import { NeedsYouQueue } from "./needs-you-queue";
import { MetricTiles, type MetricTile } from "./metric-tiles";
import { DepartmentStrip } from "./department-strip";
import { ActivityFeed } from "./activity-feed";
import { IdeasLab } from "./ideas-lab";

const RECENT_RUNS_LIMIT = 8;
const RECENT_ACTIONS_WINDOW = 100;

export default async function DashboardPage() {
  const tenant = await tryGetTenantContext();
  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  // Every panel below reads real rows -- no mock data reaches this render
  // path (Phase 3 design, Decision 1). One wide run window feeds both the
  // department strip and the (sliced) activity feed; one action window feeds
  // the governance snapshot.
  const [objects, edges, pendingActions, windowRuns, recentActions] = await Promise.all([
    listTenantCognitiveObjects(cognitiveObjectRepository, tenant.tenantId),
    cognitiveGraphRepository.listByTenant(tenant.tenantId),
    proposedActionRepository.listPendingApprovalForTenant(tenant.tenantId),
    agentRunRepository.listRecentForTenant(tenant.tenantId, RECENT_ACTIONS_WINDOW),
    proposedActionRepository.listRecentForTenant(tenant.tenantId, RECENT_ACTIONS_WINDOW),
  ]);

  const recentRuns = windowRuns.slice(0, RECENT_RUNS_LIMIT);
  const metrics = computeDashboardMetrics(objects, edges);
  const governance = computeGovernanceActivity(recentActions);
  const departments = computeDepartmentActivity(windowRuns, AGENT_REGISTRY);

  const tiles: MetricTile[] = [
    {
      label: "Needs You",
      value: pendingActions.length,
      accent: pendingActions.length > 0 ? "amber" : "default",
      hint: "actions awaiting approval",
    },
    { label: "Open Objects", value: metrics.openObjects, accent: "cyan" },
    {
      label: "Auto-executed",
      value: governance.autoExecuted,
      accent: "mint",
      hint: `${governance.humanApproved} human-approved`,
    },
    { label: "Graph Links", value: metrics.graphLinks, accent: "violet" },
    { label: "Total Objects", value: metrics.totalObjects },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-text-primary">
            Mission Control
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            A live, governed view of this workspace — what agents proposed, what auto-executed, and
            what is waiting on you.
          </p>
        </div>
        <Link
          href="/cognitive-objects/new"
          className="shrink-0 rounded-lg bg-cyan px-5 py-2.5 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90"
        >
          New object
        </Link>
      </div>

      <div className="mt-8 space-y-8">
        <MetricTiles tiles={tiles} />

        <IdeasLab />

        <NeedsYouQueue actions={pendingActions} />

        <DepartmentStrip departments={departments} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityFeed runs={recentRuns} />
          </div>

          <section className="rounded-xl border border-border-default bg-bg-surface-1 p-5">
            <h2 className="font-display text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
              By Type
            </h2>
            {metrics.byType.length === 0 ? (
              <p className="mt-4 text-sm text-text-secondary">No objects yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {metrics.byType.map((entry) => (
                  <li key={entry.type} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-text-secondary">{entry.type}</span>
                    <span className="font-display font-semibold text-text-primary">{entry.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
