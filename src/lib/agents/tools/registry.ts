import type { ActToolSpec } from "./act-tools";
import { ACT_TOOLS as BASE_ACT_TOOLS } from "./act-tools";
import { ghlReadTool, ghlWriteTool } from "./ghl-tools";
import type { ReadToolSpec } from "./read-tools";
import { READ_TOOLS as BASE_READ_TOOLS } from "./read-tools";
import type { ToolDefinition } from "../types";

// Single merged source of truth: every consumer (the engine, tests, the
// registry lookups below) imports READ_TOOLS/ACT_TOOLS from HERE, not from
// read-tools.ts/act-tools.ts directly, so a tool only has to be added once.
// Explicit Record<string, ...> annotations are required here: spreading an
// object typed only by its index signature (no literal keys of its own)
// into a new object literal does not carry that index signature into the
// inferred type, so without this TS narrows READ_TOOLS/ACT_TOOLS down to
// just the one explicit key added below.
export const READ_TOOLS: Record<string, ReadToolSpec> = { ...BASE_READ_TOOLS, ghl_read: ghlReadTool };
export const ACT_TOOLS: Record<string, ActToolSpec> = { ...BASE_ACT_TOOLS, ghl_write: ghlWriteTool };

export function getToolDefinition(toolName: string): ToolDefinition | undefined {
  const read = READ_TOOLS[toolName];
  if (read) return { name: read.name, description: read.description, kind: "read" };

  const act = ACT_TOOLS[toolName];
  if (act) {
    return {
      name: act.name,
      description: act.description,
      kind: "act",
      riskLevel: act.riskLevel,
      reversible: act.reversible,
    };
  }

  return undefined;
}

export function isKnownTool(toolName: string): boolean {
  return toolName in READ_TOOLS || toolName in ACT_TOOLS;
}
