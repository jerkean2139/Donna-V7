import { loadSkill } from "../src/lib/agents/skill-loader";
import { AGENT_REGISTRY } from "../src/lib/agents/registry";

describe("loadSkill", () => {
  it("loads real skill content and strips YAML frontmatter, for every registered agent", () => {
    for (const agent of Object.values(AGENT_REGISTRY)) {
      const content = loadSkill(agent.skillPath);
      // The fallback placeholder is the failure mode this test guards
      // against -- e.g. a Turbopack build-path regression that silently
      // makes every agent run with a generic, wrong system prompt instead
      // of failing loudly.
      expect(content).not.toBe("You are a helpful specialist agent.");
      expect(content.startsWith("---")).toBe(false);
      expect(content).toContain(agent.name);
    }
  });

  it("falls back to the generic placeholder for a skill path that doesn't exist", () => {
    expect(loadSkill("nonexistent/agent.md")).toBe("You are a helpful specialist agent.");
  });
});
