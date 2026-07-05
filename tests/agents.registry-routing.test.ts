import { AGENT_REGISTRY, routeToAgent } from "../src/lib/agents/registry";
import { isKnownTool } from "../src/lib/agents/tools/registry";

describe("AGENT_REGISTRY", () => {
  it("every agent's tools are known tools", () => {
    for (const agent of Object.values(AGENT_REGISTRY)) {
      for (const toolName of agent.tools) {
        expect(isKnownTool(toolName)).toBe(true);
      }
    }
  });

  it("every agent has a distinct skill path", () => {
    const paths = Object.values(AGENT_REGISTRY).map((a) => a.skillPath);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("routeToAgent", () => {
  it("routes a research task to Deep Research", () => {
    expect(routeToAgent("Can you do a deep dive investigate the competitor landscape?")).toBe("Deep Research");
  });

  it("routes a customer complaint to Customer Service", () => {
    expect(routeToAgent("A customer filed a complaint about a refund")).toBe("Customer Service");
  });

  it("routes a deployment task to Programming", () => {
    expect(routeToAgent("Can you build an API endpoint and deploy it?")).toBe("Programming");
  });

  it("routes an expense task to Bookkeeping", () => {
    expect(routeToAgent("Log this expense receipt from Office Depot")).toBe("Bookkeeping");
  });

  it("returns null when nothing matches", () => {
    expect(routeToAgent("asdkjfh qwoeiru zzz")).toBeNull();
  });

  it("prefers the higher-scoring agent when keywords from multiple agents appear", () => {
    // "customer" (Customer Service) is a single short keyword; a message
    // dense with Bookkeeping-specific terms should still route to Bookkeeping.
    const result = routeToAgent("Reconcile this customer's invoice and receipt transaction in the ledger");
    expect(result).toBe("Bookkeeping");
  });
});
