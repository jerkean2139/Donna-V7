import { ACT_TOOLS, READ_TOOLS, getToolDefinition, isKnownTool } from "../src/lib/agents/tools/registry";

describe("tool registry", () => {
  it("classifies every registered read tool as kind 'read' with no risk metadata", () => {
    for (const name of Object.keys(READ_TOOLS)) {
      const definition = getToolDefinition(name);
      expect(definition?.kind).toBe("read");
      expect(definition?.riskLevel).toBeUndefined();
      expect(definition?.reversible).toBeUndefined();
    }
  });

  it("classifies every registered act tool as kind 'act' with risk metadata", () => {
    for (const name of Object.keys(ACT_TOOLS)) {
      const definition = getToolDefinition(name);
      expect(definition?.kind).toBe("act");
      expect(definition?.riskLevel).toBeDefined();
      expect(typeof definition?.reversible).toBe("boolean");
    }
  });

  it("returns undefined for an unknown tool name", () => {
    expect(getToolDefinition("delete_everything")).toBeUndefined();
    expect(isKnownTool("delete_everything")).toBe(false);
  });

  it("marks send_email as irreversible (external, never auto-executes per Decision 3)", () => {
    expect(ACT_TOOLS.send_email!.reversible).toBe(false);
  });

  it("marks create_followup_object as reversible and low risk (internal, can auto-execute)", () => {
    expect(ACT_TOOLS.create_followup_object!.reversible).toBe(true);
    expect(ACT_TOOLS.create_followup_object!.riskLevel).toBe("low");
  });

  it("read and act tool namespaces do not overlap", () => {
    const readNames = new Set(Object.keys(READ_TOOLS));
    const actNames = new Set(Object.keys(ACT_TOOLS));
    for (const name of readNames) {
      expect(actNames.has(name)).toBe(false);
    }
  });
});
