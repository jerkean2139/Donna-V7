import Link from "next/link";
import type { ProposedAction } from "@/lib/agents/proposed-action/types";
import type { RiskLevel } from "@/lib/cognitive-object/types";
import { approveProposedActionAction, rejectProposedActionAction } from "@/app/agents/actions";

// Risk carries meaning in this product, so it gets a consistent color
// everywhere (Phase 3 design, Decision 2): amber = attention, red =
// high/irreversible, cyan = low/reversible.
function riskChipClass(risk: RiskLevel): string {
  switch (risk) {
    case "critical":
    case "high":
      return "text-red bg-[var(--red-dim)] border-red/30";
    case "medium":
      return "text-amber bg-[var(--amber-dim)] border-amber/30";
    default:
      return "text-cyan bg-[var(--cyan-dim)] border-cyan/30";
  }
}

function ActionCard({ action }: { action: ProposedAction }) {
  return (
    <div
      className="rounded-lg border border-border-default bg-bg-surface-1 p-4"
      style={{ borderLeftWidth: "3px", borderLeftColor: action.reversible ? "#00d4ff" : "#ff3860" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
              {action.toolName}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${riskChipClass(action.effectiveRiskLevel)}`}
            >
              {action.effectiveRiskLevel}
            </span>
            {!action.reversible && (
              <span className="rounded-full border border-red/30 bg-[var(--red-dim)] px-2 py-0.5 font-mono text-[10px] text-red">
                irreversible
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-text-primary">{action.description}</p>
          {action.approvalReason && (
            <p className="mt-1 text-xs text-text-secondary">{action.approvalReason}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border-default pt-3">
        <Link
          href={`/cognitive-objects/${action.objectId}`}
          className="font-mono text-[11px] text-text-secondary transition-colors hover:text-cyan"
        >
          View object →
        </Link>
        <div className="flex gap-2">
          <form action={rejectProposedActionAction}>
            <input type="hidden" name="proposedActionId" value={action.id} />
            <input type="hidden" name="objectId" value={action.objectId} />
            <button
              type="submit"
              className="rounded border border-border-default bg-bg-surface-2 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-red/40 hover:text-red"
            >
              Reject
            </button>
          </form>
          <form action={approveProposedActionAction}>
            <input type="hidden" name="proposedActionId" value={action.id} />
            <input type="hidden" name="objectId" value={action.objectId} />
            <button
              type="submit"
              className="rounded bg-cyan px-3 py-1.5 text-xs font-semibold text-bg-base transition-opacity hover:opacity-90"
            >
              Approve
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// The hero of Mission Control (Phase 3 design, Decision 1): the queue of
// agent actions governance staged for a human. The donor UIs hide the human;
// this puts them at the top of the fold.
export function NeedsYouQueue({ actions }: { actions: ProposedAction[] }) {
  return (
    <section aria-labelledby="needs-you-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="needs-you-heading"
          className="font-display text-[11px] font-semibold uppercase tracking-widest text-text-secondary"
        >
          Needs You
        </h2>
        <span className="rounded-full border border-border-default bg-bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text-secondary">
          {actions.length} pending
        </span>
      </div>

      {actions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default bg-bg-surface-1 p-8 text-center">
          <p className="text-sm text-text-secondary">Nothing waiting on you.</p>
          <p className="mt-1 text-xs text-text-muted">
            Agents auto-execute only low-risk, reversible actions. Anything riskier lands here for
            your approval.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      )}
    </section>
  );
}
