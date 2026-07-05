import type { ToolDefinition } from "../types";
import { ACT_TOOLS } from "./act-tools";
import { READ_TOOLS } from "./read-tools";

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

export { ACT_TOOLS, READ_TOOLS };
