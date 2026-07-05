import Link from "next/link";
import type { AgentRun } from "@/lib/agents/agent-run/types";

// Until Phase 2.5's memory_events stream lands, the activity feed reads
// agent_runs directly -- the documented fallback (Phase 3 design, Decision 4).
// Real runs only; no fabricated "live" code monitors.
export function ActivityFeed({ runs }: { runs: AgentRun[] }) {
  return (
    <section aria-labelledby="activity-heading" className="rounded-xl border border-border-default bg-bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="activity-heading"
          className="font-display text-[11px] font-semibold uppercase tracking-widest text-text-secondary"
        >
          Recent Activity
        </h2>
        <Link
          href="/cognitive-objects"
          className="font-mono text-[11px] text-text-muted transition-colors hover:text-cyan"
        >
          View all →
        </Link>
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-text-secondary">No agent runs yet.</p>
      ) : (
        <ul className="divide-y divide-border-default">
          {runs.map((run) => (
            <li key={run.id} className="py-3 first:pt-0 last:pb-0">
              <Link
                href={`/cognitive-objects/${run.objectId}`}
                className="group flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[13px] font-semibold text-violet">
                      {run.agentName}
                    </span>
                    <span
                      className={`font-mono text-[10px] ${run.status === "failed" ? "text-red" : "text-mint"}`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-text-secondary group-hover:text-text-primary">
                    {run.task}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-text-muted">
                  {run.toolCalls.length} tool{run.toolCalls.length === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
