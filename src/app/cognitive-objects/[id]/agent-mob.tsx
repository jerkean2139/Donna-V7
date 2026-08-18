import { RiskBadge } from "@/components/badges";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import type { AgentRun } from "@/lib/agents/agent-run/types";
import type { ProposedAction, ProposedActionStatus } from "@/lib/agents/proposed-action/types";
import {
  approveProposedActionAction,
  rejectProposedActionAction,
  startAgentTaskAction,
} from "@/app/agents/actions";

const agentNames = Object.keys(AGENT_REGISTRY);

const STATUS_STYLES: Record<ProposedActionStatus, string> = {
  proposed: "bg-amber-400/12 text-amber-300 ring-amber-400/30",
  approved: "bg-cyan-400/12 text-cyan-300 ring-cyan-400/30",
  executed: "bg-emerald-400/14 text-emerald-200 ring-emerald-400/35",
  rejected: "bg-slate-400/10 text-slate-400 ring-slate-400/20",
  failed: "bg-rose-500/16 text-rose-300 ring-rose-500/40",
};

function StatusPill({ status }: { status: ProposedActionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

interface AgentMobSectionProps {
  objectId: string;
  agentRuns: AgentRun[];
  proposedActions: ProposedAction[];
}

export function AgentMobSection({ objectId, agentRuns, proposedActions }: AgentMobSectionProps) {
  const pending = proposedActions.filter((action) => action.status === "proposed");

  return (
    <section className="mt-8 donna-card rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-ink">Agent Mob</h2>
          <p className="mt-2 text-sm text-muted">
            Route this object to a specialist agent. Read tools inform its reasoning; any action
            with side effects becomes a Proposed Action that you must approve first.
          </p>
        </div>
      </div>

      {/* Run an agent */}
      <form action={startAgentTaskAction} className="mt-5 grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
        <input type="hidden" name="objectId" value={objectId} />
        <label className="block">
          <span className="text-xs font-medium text-muted">Agent</span>
          <select
            name="agentName"
            className="mt-1 w-full rounded-lg border border-hairline bg-surface p-2.5 text-sm text-ink"
            defaultValue={agentNames[0]}
          >
            {agentNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Task</span>
          <input
            name="task"
            required
            minLength={3}
            maxLength={2000}
            placeholder="e.g. Research competitor pricing and summarize the risks"
            className="mt-1 w-full rounded-lg border border-hairline bg-surface p-2.5 text-sm text-ink placeholder:text-faint"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-[#06080f]"
        >
          Run agent
        </button>
      </form>

      {/* Proposed actions awaiting governance */}
      {proposedActions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-ink">
            Proposed actions{" "}
            <span className="font-normal text-faint">
              ({pending.length} awaiting approval)
            </span>
          </h3>
          <ul className="mt-3 space-y-3">
            {proposedActions.map((action) => (
              <li key={action.id} className="rounded-lg border border-hairline bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ink">{action.description}</span>
                  <span className="flex items-center gap-2">
                    <StatusPill status={action.status} />
                    <RiskBadge level={action.effectiveRiskLevel} />
                  </span>
                </div>
                <p className="mt-1 text-xs text-faint">
                  Tool: <span className="font-mono">{action.toolName}</span> ·{" "}
                  {action.reversible ? "reversible" : "irreversible"}
                </p>
                {action.approvalReason && (
                  <p className="mt-2 text-sm text-amber-200">{action.approvalReason}</p>
                )}
                {action.resultSummary && (
                  <p className="mt-2 text-sm text-muted">{action.resultSummary}</p>
                )}

                {action.status === "proposed" && (
                  <div className="mt-3 flex gap-2">
                    <form action={approveProposedActionAction}>
                      <input type="hidden" name="proposedActionId" value={action.id} />
                      <input type="hidden" name="objectId" value={objectId} />
                      <button
                        type="submit"
                        className="rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 px-3.5 py-1.5 text-sm font-semibold text-[#06080f]"
                      >
                        Approve &amp; execute
                      </button>
                    </form>
                    <form action={rejectProposedActionAction}>
                      <input type="hidden" name="proposedActionId" value={action.id} />
                      <input type="hidden" name="objectId" value={objectId} />
                      <button
                        type="submit"
                        className="rounded-lg border border-hairline px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-rose-400/40 hover:text-rose-200"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Agent run history */}
      {agentRuns.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-ink">Agent runs</h3>
          <ul className="mt-3 space-y-3">
            {agentRuns.map((run) => (
              <li key={run.id} className="rounded-lg border border-hairline bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ink">{run.agentName}</span>
                  <span className="text-xs text-faint">
                    {run.status} · {run.createdAt.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{run.task}</p>
                {run.responseText && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                    {run.responseText}
                  </p>
                )}
                {run.toolCalls.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-faint">
                    {run.toolCalls.map((call, index) => (
                      <li key={index}>
                        <span className="font-mono">{call.toolName}</span> ({call.kind}) —{" "}
                        {call.resultSummary}
                      </li>
                    ))}
                  </ul>
                )}
                {run.delegationRequest && (
                  <p className="mt-2 text-xs text-cyan-200">
                    Delegated to {run.delegationRequest.agentName}: {run.delegationRequest.reason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
