import type { DepartmentActivity } from "@/lib/dashboard/mission-control";

// The 36-agent roster grouped by department, with real recent-run counts.
// A department with runs in the window reads as "active" (violet dot); an
// idle one stays muted. No fake "online" status -- activity is derived from
// actual agent_runs (Phase 3 design, Decision 3).
export function DepartmentStrip({ departments }: { departments: DepartmentActivity[] }) {
  return (
    <section aria-labelledby="departments-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="departments-heading"
          className="font-display text-[11px] font-semibold uppercase tracking-widest text-text-secondary"
        >
          Departments
        </h2>
        <span className="rounded-full border border-border-default bg-bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text-secondary">
          {departments.length} departments
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {departments.map((dept) => {
          const active = dept.recentRuns > 0;
          return (
            <div
              key={dept.department}
              className="relative overflow-hidden rounded-lg border border-border-default bg-bg-surface-1 p-3.5"
            >
              <span className="absolute inset-x-0 top-0 h-0.5 bg-violet" aria-hidden="true" />
              <div className="flex items-center justify-between">
                <span className="font-display text-[13px] font-semibold text-text-primary">
                  {dept.department}
                </span>
                <span
                  className={`h-[7px] w-[7px] rounded-full ${active ? "bg-mint" : "bg-text-muted"}`}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-1 font-mono text-[10px] text-text-muted">
                <span className="text-violet">{dept.agentCount}</span> agents ·{" "}
                <span className={active ? "text-mint" : ""}>{dept.recentRuns}</span> recent runs
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
