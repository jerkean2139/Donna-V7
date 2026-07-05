import type { CognitiveObjectStatus, RiskLevel } from "@/lib/cognitive-object/types";

// Semantic colors so a critical item reads at a glance. Translucent fills with
// a ring — tuned for the dark cinematic surfaces (AA-contrast text).
const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-slate-400/10 text-slate-300 ring-slate-400/25",
  medium: "bg-amber-400/12 text-amber-300 ring-amber-400/30",
  high: "bg-orange-400/14 text-orange-300 ring-orange-400/35",
  critical: "bg-rose-500/16 text-rose-300 ring-rose-500/40",
};

// Status buckets: neutral (draft), in-flight (active/analyzing), attention
// (approval_required), positive (approved/executed), muted (archived).
const STATUS_STYLES: Record<CognitiveObjectStatus, string> = {
  draft: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
  active: "bg-cyan-400/12 text-cyan-300 ring-cyan-400/30",
  analyzing: "bg-violet-400/12 text-violet-300 ring-violet-400/30",
  approval_required: "bg-amber-400/12 text-amber-300 ring-amber-400/30",
  approved: "bg-emerald-400/12 text-emerald-300 ring-emerald-400/30",
  executed: "bg-emerald-400/16 text-emerald-200 ring-emerald-400/40",
  archived: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
};

const BASE =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset";

export function RiskBadge({ level, showLabel = true }: { level: RiskLevel; showLabel?: boolean }) {
  return (
    <span className={`${BASE} ${RISK_STYLES[level]}`}>
      {level}
      {showLabel ? " risk" : ""}
    </span>
  );
}

export function StatusBadge({ status }: { status: CognitiveObjectStatus }) {
  return <span className={`${BASE} ${STATUS_STYLES[status]}`}>{status.replace(/_/g, " ")}</span>;
}
