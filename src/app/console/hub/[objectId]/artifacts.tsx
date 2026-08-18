import { RiskBadge } from "@/components/badges";
import type { ProposedAction, ProposedActionStatus } from "@/lib/agents/proposed-action/types";
import { approveFromHubAction, rejectFromHubAction } from "./actions";

const STATUS_STYLES: Record<ProposedActionStatus, string> = {
  proposed: "bg-amber-400/12 text-amber-300 ring-amber-400/30",
  approved: "bg-cyan-400/12 text-cyan-300 ring-cyan-400/30",
  executed: "bg-emerald-400/14 text-emerald-200 ring-emerald-400/35",
  rejected: "bg-slate-400/10 text-slate-400 ring-slate-400/20",
  failed: "bg-rose-500/16 text-rose-300 ring-rose-500/40",
};

function StatusPill({ status }: { status: ProposedActionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
}

// The actual thing the agent created, rendered by kind — this is the "work"
// in the work hub, not a JSON blob.
function ArtifactBody({ action }: { action: ProposedAction }) {
  const args = action.args ?? {};

  if (action.toolName === "send_email") {
    return (
      <div className="overflow-hidden rounded-lg border border-hairline bg-[#0b1020]">
        <div className="space-y-1 border-b border-hairline px-4 py-2.5 text-xs">
          <div className="flex gap-2">
            <span className="w-14 shrink-0 text-faint">To</span>
            <span className="text-ink">{str(args.to) || "—"}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-14 shrink-0 text-faint">Subject</span>
            <span className="font-medium text-ink">{str(args.subject) || "—"}</span>
          </div>
        </div>
        <p className="whitespace-pre-wrap px-4 py-3 text-sm leading-6 text-muted">
          {str(args.body) || "No body."}
        </p>
      </div>
    );
  }

  if (action.toolName === "create_followup_object") {
    return (
      <div className="rounded-lg border border-hairline bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium capitalize text-muted ring-1 ring-inset ring-white/10">
            {str(args.objectType) || "object"}
          </span>
          <span className="font-medium text-ink">{str(args.title) || "Untitled"}</span>
        </div>
        {str(args.summary) && <p className="mt-2 text-sm text-muted">{str(args.summary)}</p>}
      </div>
    );
  }

  // Generic fallback: labelled key/value.
  return (
    <dl className="rounded-lg border border-hairline bg-white/5 p-4 text-sm">
      {Object.entries(args).map(([key, value]) => (
        <div key={key} className="flex gap-2 py-0.5">
          <dt className="w-28 shrink-0 capitalize text-faint">{key}</dt>
          <dd className="text-muted">{str(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ArtifactCard({ action, objectId }: { action: ProposedAction; objectId: string }) {
  return (
    <div className="donna-card rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{action.description}</p>
          <p className="mt-0.5 text-xs text-faint">
            <span className="font-mono">{action.toolName}</span> ·{" "}
            {action.reversible ? "reversible" : "irreversible"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={action.status} />
          <RiskBadge level={action.effectiveRiskLevel} />
        </div>
      </div>

      {action.approvalReason && action.status === "proposed" && (
        <p className="mt-2 text-sm text-amber-200">{action.approvalReason}</p>
      )}

      <div className="mt-3">
        <ArtifactBody action={action} />
      </div>

      {action.resultSummary && (
        <p className="mt-2 text-sm text-emerald-200">{action.resultSummary}</p>
      )}

      {action.status === "proposed" && (
        <div className="mt-4 flex gap-2">
          <form action={approveFromHubAction}>
            <input type="hidden" name="proposedActionId" value={action.id} />
            <input type="hidden" name="objectId" value={objectId} />
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 px-3.5 py-1.5 text-sm font-semibold text-[#06080f]"
            >
              Approve &amp; execute
            </button>
          </form>
          <form action={rejectFromHubAction}>
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
    </div>
  );
}
