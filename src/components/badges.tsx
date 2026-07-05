import type { CognitiveObjectStatus, RiskLevel } from "@/lib/cognitive-object/types";

// Semantic colors so a critical item reads at a glance instead of blending
// into a wall of grey. Tuned for the light dashboard with AA-contrast text.
const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

// Status buckets: neutral (draft), in-flight (active/analyzing), attention
// (approval_required), positive (approved/executed), muted (archived).
const STATUS_STYLES: Record<CognitiveObjectStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  active: "bg-sky-50 text-sky-800 border-sky-200",
  analyzing: "bg-indigo-50 text-indigo-800 border-indigo-200",
  approval_required: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  executed: "bg-emerald-100 text-emerald-900 border-emerald-300",
  archived: "bg-slate-50 text-slate-500 border-slate-200",
};

const BASE = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize";

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
