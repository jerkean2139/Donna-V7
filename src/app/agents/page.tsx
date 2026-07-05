import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { agentRunRepository } from "@/lib/repositories";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import { buildAgentRoster, groupRosterByDepartment } from "@/lib/agents/roster";
import { AgentCard } from "./agent-card";

export default async function AgentsPage() {
  const tenant = await tryGetTenantContext();
  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  const aggregates = await agentRunRepository.aggregateByAgentForTenant(tenant.tenantId);
  const roster = buildAgentRoster(AGENT_REGISTRY, aggregates);
  const departments = groupRosterByDepartment(roster);
  const totalRuns = aggregates.reduce((sum, agg) => sum + agg.totalRuns, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-text-primary">Agents</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Your {roster.length}-agent roster, grouped by department. Every stat is real — computed
          from this workspace&apos;s {totalRuns} agent run{totalRuns === 1 ? "" : "s"}. Flip a card
          to see what an agent can do and what stays gated behind your approval.
        </p>
      </div>

      <div className="mt-8 space-y-10">
        {departments.map((group) => (
          <section key={group.department} aria-labelledby={`dept-${group.department}`}>
            <div className="mb-3 flex items-center gap-3">
              <h2
                id={`dept-${group.department}`}
                className="font-display text-[11px] font-semibold uppercase tracking-widest text-text-secondary"
              >
                {group.department}
              </h2>
              <span className="font-mono text-[11px] text-text-muted">{group.agents.length} agents</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.agents.map((agent) => (
                <AgentCard key={agent.name} agent={agent} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
