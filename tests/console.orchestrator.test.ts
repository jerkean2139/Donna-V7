import { matchedKeywords, planDonnaTurn } from "../src/lib/console/orchestrator";

describe("planDonnaTurn", () => {
  it("routes a research task to Deep Research", () => {
    const plan = planDonnaTurn("Can you research our competitor pricing and market position?");
    expect(plan.routedAgent).toBe("Deep Research");
    expect(plan.reply).toContain("Deep Research");
    expect(plan.reply).toContain("EA");
  });

  it("routes a coding task to Programming", () => {
    const plan = planDonnaTurn("Build an API endpoint and fix the deploy bug");
    expect(plan.routedAgent).toBe("Programming");
    expect(plan.reply).toContain("Programming");
  });

  it("routes a support task to Customer Service", () => {
    const plan = planDonnaTurn("A customer filed a complaint and wants a refund");
    expect(plan.routedAgent).toBe("Customer Service");
  });

  it("stays conversational on a greeting and routes nothing", () => {
    const plan = planDonnaTurn("hi");
    expect(plan.routedAgent).toBeNull();
    expect(plan.reply.toLowerCase()).toContain("working on");
  });

  it("handles it herself when no specialist matches", () => {
    const plan = planDonnaTurn("Please note that the weather is nice today");
    expect(plan.routedAgent).toBeNull();
    expect(plan.reply).toContain("Cognitive Object");
  });

  it("handles an empty message gracefully", () => {
    const plan = planDonnaTurn("   ");
    expect(plan.routedAgent).toBeNull();
    expect(plan.reply.length).toBeGreaterThan(0);
  });

  it("explains routing with the matched keywords", () => {
    const hits = matchedKeywords("Deep Research", "do a deep dive on the competitor");
    expect(hits).toContain("deep dive");
    expect(hits).toContain("competitor");
  });
});
