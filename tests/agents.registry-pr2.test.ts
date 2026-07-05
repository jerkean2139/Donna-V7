import { AGENT_REGISTRY, routeToAgent } from "../src/lib/agents/registry";

// PR2 ported the remaining KOB v2 skills. These tests lock down the
// deliberate choices in that port so a future edit that silently drifts
// from them (e.g. handing send_email to an agent whose skill doesn't call
// for it) fails loudly instead of passing quietly.
describe("AGENT_REGISTRY (PR2 roster)", () => {
  it("has the full 36-agent roster (4 from PR1 + 32 from PR2)", () => {
    expect(Object.keys(AGENT_REGISTRY)).toHaveLength(36);
  });

  it("grants send_email ONLY to the agents whose core deliverable is an email", () => {
    const expected = new Set([
      "Customer Service", // PR1
      "Recruitment",
      "Proposals",
      "Email Marketing",
      "Communication",
      "Prospecting",
    ]);

    for (const agent of Object.values(AGENT_REGISTRY)) {
      const hasEmail = agent.tools.includes("send_email");
      expect(hasEmail).toBe(expected.has(agent.name));
    }
  });

  it("does NOT grant ghl_api to any agent -- it doesn't exist yet (PR3)", () => {
    for (const agent of Object.values(AGENT_REGISTRY)) {
      expect(agent.tools).not.toContain("ghl_api");
    }
  });

  it("GHL Funnels and GHL Campaigns are registered with only the default tools, pending PR3's connector", () => {
    expect(AGENT_REGISTRY["GHL Funnels"]?.tools).toEqual(["web_search", "web_fetch", "create_followup_object"]);
    expect(AGENT_REGISTRY["GHL Campaigns"]?.tools).toEqual(["web_search", "web_fetch", "create_followup_object"]);
  });

  it("every agent has a non-empty routing keyword list", () => {
    for (const agent of Object.values(AGENT_REGISTRY)) {
      expect(agent.routingKeywords.length).toBeGreaterThan(0);
    }
  });
});

describe("routeToAgent (PR2 roster)", () => {
  it.each([
    ["Draft a job posting and schedule interviews for the new hire", "Recruitment"],
    ["Deploy this Docker container and set up the CI/CD pipeline", "DevOps Engineer"],
    ["How should we structure this microservices architecture?", "System Architect"],
    ["We have a slow query in production, may need an index", "Database Optimizer"],
    ["I have a new business idea, want to brainstorm the MVP", "Ideation Analyst"],
    ["Write a blog article with good SEO", "Content"],
    ["Set up a GHL funnel with lead capture", "GHL Funnels"],
  ])("routes %j to %s", (task, expectedAgent) => {
    expect(routeToAgent(task)).toBe(expectedAgent);
  });
});
