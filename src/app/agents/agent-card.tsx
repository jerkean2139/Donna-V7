"use client";

import { useState } from "react";
import { AgentHeadshot, agentColor } from "@/components/agent-headshot";
import type { AgentRosterEntry, AgentToolProfile } from "@/lib/agents/roster";

function toolChipClass(tool: AgentToolProfile): string {
  if (tool.kind === "read") return "text-cyan bg-[var(--cyan-dim)] border-cyan/30";
  if (tool.reversible === false || tool.riskLevel === "high" || tool.riskLevel === "critical") {
    return "text-red bg-[var(--red-dim)] border-red/30";
  }
  return "text-amber bg-[var(--amber-dim)] border-amber/30";
}

function toolLabel(tool: AgentToolProfile): string {
  if (tool.kind === "read") return "read · inline";
  const risk = tool.riskLevel ?? "act";
  return tool.reversible === false ? `${risk} · irreversible` : `${risk} · reversible`;
}

// The signature interaction ported from Agent Nine, but every number is real
// (from agent_runs) and the back is a functional capability profile, not a
// mock "scouting report" (Phase 3 design, Decision 3).
export function AgentCard({ agent }: { agent: AgentRosterEntry }) {
  const [flipped, setFlipped] = useState(false);
  const color = agentColor(agent.name);

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      className="group relative h-56 w-full text-left [perspective:1200px]"
    >
      <div
        className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 flex flex-col rounded-xl border border-border-default bg-bg-surface-1 p-4 [backface-visibility:hidden]"
          style={{ borderTop: `2px solid ${color}` }}
        >
          <div className="flex items-center gap-3">
            <AgentHeadshot name={agent.name} size={44} />
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-semibold text-text-primary">
                {agent.name}
              </div>
              <div className="font-mono text-[10px] text-text-muted">
                {agent.department} · {agent.supervisor}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <div className="font-display text-2xl font-bold text-text-primary">
                {agent.stats.totalRuns}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wide text-text-muted">runs</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-mint">
                {agent.stats.successRate === null ? "—" : `${agent.stats.successRate}%`}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wide text-text-muted">
                {agent.stats.successRate === null ? "no runs yet" : "success"}
              </div>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between">
            {agent.alwaysRequiresApproval ? (
              <span className="rounded-full border border-red/30 bg-[var(--red-dim)] px-2 py-0.5 font-mono text-[9px] text-red">
                gated actions
              </span>
            ) : agent.hasGovernedActions ? (
              <span className="rounded-full border border-amber/30 bg-[var(--amber-dim)] px-2 py-0.5 font-mono text-[9px] text-amber">
                governed actions
              </span>
            ) : (
              <span className="rounded-full border border-cyan/30 bg-[var(--cyan-dim)] px-2 py-0.5 font-mono text-[9px] text-cyan">
                read-only
              </span>
            )}
            <span className="font-mono text-[9px] text-text-muted group-hover:text-text-secondary">
              flip →
            </span>
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 flex flex-col rounded-xl border border-border-default bg-bg-surface-1 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ borderTop: `2px solid ${color}` }}
        >
          <div className="font-display text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Capabilities
          </div>
          <div className="mt-2 flex flex-1 flex-col gap-1.5 overflow-y-auto">
            {agent.tools.map((tool) => (
              <div key={tool.name} className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[11px] text-text-secondary">{tool.name}</span>
                <span
                  className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[8px] ${toolChipClass(tool)}`}
                >
                  {toolLabel(tool)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[9px] leading-relaxed text-text-muted">
            {agent.alwaysRequiresApproval
              ? "Writes never auto-execute — every action waits for your approval."
              : agent.hasGovernedActions
                ? "Low-risk reversible actions auto-execute; anything riskier waits for you."
                : "Reads only — proposes nothing, changes nothing."}
          </p>
        </div>
      </div>
    </button>
  );
}
