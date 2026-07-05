import { GraphContextRetriever } from "../src/lib/ai/context-retriever";
import type { ReasoningEngine, ReasoningInput, ReasoningOutput } from "../src/lib/ai/types";
import { InMemoryCognitiveGraphRepository } from "../src/lib/cognitive-graph/repository";
import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";
import { InMemoryEvolutionLoopRunRepository } from "../src/lib/evolution-loop/repository";
import { startEvolutionLoopForObject } from "../src/lib/evolution-loop/service";

// A scripted engine that returns whatever the test configures, so these
// tests exercise the TRUST BOUNDARY (service.ts's own logic) rather than the
// FakeReasoningEngine's canned MVP content.
class ScriptedReasoningEngine implements ReasoningEngine {
  constructor(private readonly output: ReasoningOutput) {}

  async reasonAboutObject(_input: ReasoningInput): Promise<ReasoningOutput> {
    return this.output;
  }

  async scoreDecisionQuality(): Promise<never> {
    throw new Error("not used in these tests");
  }
}

function baseOutput(overrides: Partial<ReasoningOutput> = {}): ReasoningOutput {
  return {
    intentSummary: "Clarify whether to raise the base plan price.",
    contextSummary: "Used the object body and one related prior decision.",
    assumptions: [
      { text: "Churn will not spike.", riskLevel: "medium", needsVerification: false, sourceObjectIds: [] },
    ],
    optionsConsidered: [
      { name: "Raise now", summary: "Ship the increase this week.", tradeoffs: ["Faster revenue"] },
      { name: "A/B test first", summary: "Test on 10% of new signups.", tradeoffs: ["Slower, safer"] },
    ],
    critique: [{ lens: "operator", concern: "No churn data from a comparable prior change." }],
    risks: [
      { riskLevel: "medium", summary: "Could increase churn.", mitigation: "Monitor weekly.", sourceObjectIds: [] },
    ],
    recommendation: "A/B test the increase before a full rollout.",
    suggestedConfidence: 92,
    confidenceRationale: "Strong reasoning, but overridden by test.",
    ...overrides,
  };
}

async function setup() {
  const objectRepository = new InMemoryCognitiveObjectRepository();
  const loopRepository = new InMemoryEvolutionLoopRunRepository();
  const graphRepository = new InMemoryCognitiveGraphRepository();
  const contextRetriever = new GraphContextRetriever(graphRepository, objectRepository);
  return { objectRepository, loopRepository, graphRepository, contextRetriever };
}

describe("Evolution Loop trust boundary", () => {
  it("gates a high-confidence AI output behind human approval when object risk is critical", async () => {
    const { objectRepository, loopRepository, contextRetriever } = await setup();
    const engine = new ScriptedReasoningEngine(
      baseOutput({
        suggestedConfidence: 99,
        assumptions: [
          { text: "Safe to proceed.", riskLevel: "low", needsVerification: false, sourceObjectIds: ["obj_x"] },
        ],
      }),
    );

    const object = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Critical risk decision",
      source: "manual",
      riskLevel: "critical",
      tags: [],
    });

    const run = await startEvolutionLoopForObject(objectRepository, loopRepository, engine, contextRetriever, {
      objectId: object.id,
      tenantId: "tenant_a",
    });

    // The model reported near-total confidence; governance still overrides
    // it because critical risk always requires approval, regardless of what
    // the AI thinks. This is the core Phase 1 invariant.
    expect(run.approvalRequired).toBe(true);
    expect(run.confidenceScore).toBe(99);
  });

  it("discounts confidence to the evidence cap when no assumption or risk cites retrieved context", async () => {
    const { objectRepository, loopRepository, contextRetriever } = await setup();
    const engine = new ScriptedReasoningEngine(
      baseOutput({
        suggestedConfidence: 95,
        assumptions: [
          { text: "No citations here.", riskLevel: "low", needsVerification: false, sourceObjectIds: [] },
        ],
        risks: [
          { riskLevel: "low", summary: "Also uncited.", mitigation: "None needed.", sourceObjectIds: [] },
        ],
      }),
    );

    const object = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Uncited reasoning",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const run = await startEvolutionLoopForObject(objectRepository, loopRepository, engine, contextRetriever, {
      objectId: object.id,
      tenantId: "tenant_a",
    });

    // 95 reported, but nothing was cited, so it is capped at 60 -- well
    // below the 85 approval threshold and the 95 auto-execute threshold.
    expect(run.confidenceScore).toBe(60);
    expect(run.approvalRequired).toBe(true);
  });

  it("does not discount confidence when at least one assumption or risk cites retrieved context", async () => {
    const { objectRepository, loopRepository, contextRetriever } = await setup();
    const engine = new ScriptedReasoningEngine(
      baseOutput({
        suggestedConfidence: 90,
        assumptions: [
          { text: "Cited.", riskLevel: "low", needsVerification: false, sourceObjectIds: ["obj_neighbor"] },
        ],
      }),
    );

    const object = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Cited reasoning",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const run = await startEvolutionLoopForObject(objectRepository, loopRepository, engine, contextRetriever, {
      objectId: object.id,
      tenantId: "tenant_a",
    });

    expect(run.confidenceScore).toBe(90);
    // low risk + confidence >= 85 threshold => no approval required.
    expect(run.approvalRequired).toBe(false);
  });

  it("strips sourceObjectIds before persisting assumptions and risks", async () => {
    const { objectRepository, loopRepository, contextRetriever } = await setup();
    const engine = new ScriptedReasoningEngine(baseOutput());

    const object = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Persisted shape check",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const run = await startEvolutionLoopForObject(objectRepository, loopRepository, engine, contextRetriever, {
      objectId: object.id,
      tenantId: "tenant_a",
    });

    expect(run.assumptions[0]).not.toHaveProperty("sourceObjectIds");
    expect(run.risks[0]).not.toHaveProperty("sourceObjectIds");
  });

  it("propagates a failed reasoning call without creating a partial run", async () => {
    const { objectRepository, loopRepository, contextRetriever } = await setup();
    const failingEngine: ReasoningEngine = {
      reasonAboutObject: async () => {
        throw new Error("AI provider unavailable");
      },
      scoreDecisionQuality: async () => {
        throw new Error("not used");
      },
    };

    const object = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Failure path",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    await expect(
      startEvolutionLoopForObject(objectRepository, loopRepository, failingEngine, contextRetriever, {
        objectId: object.id,
        tenantId: "tenant_a",
      }),
    ).rejects.toThrow("AI provider unavailable");

    const { listEvolutionLoopRunsForObject } = await import("../src/lib/evolution-loop/service");
    const runs = await listEvolutionLoopRunsForObject(loopRepository, {
      objectId: object.id,
      tenantId: "tenant_a",
    });
    expect(runs).toHaveLength(0);
  });
});

describe("GraphContextRetriever", () => {
  it("retrieves neighbors ranked by edge strength and excludes unusable edges", async () => {
    const { objectRepository, graphRepository, contextRetriever } = await setup();

    const root = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Root decision",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });
    const strongNeighbor = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "lesson",
      title: "Strong prior lesson",
      summary: "Learned this before.",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });
    const weakUnconfirmedNeighbor = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "research",
      title: "Weak unconfirmed AI-inferred contradiction",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    // Human-sourced, high strength: usable.
    await graphRepository.createEdge({
      tenantId: "tenant_a",
      fromObjectId: root.id,
      toObjectId: strongNeighbor.id,
      relationshipType: "supports",
      strength: 95,
      source: "human",
      createdByUserId: "user_1",
    });

    // AI-inferred "contradicts" below the high-trust threshold, unconfirmed:
    // must be excluded per canUseRelationshipForRecommendation policy.
    await graphRepository.createEdge({
      tenantId: "tenant_a",
      fromObjectId: root.id,
      toObjectId: weakUnconfirmedNeighbor.id,
      relationshipType: "contradicts",
      strength: 40,
      source: "ai_inferred",
      createdByAgentId: "agent_1",
    });

    const context = await contextRetriever.retrieveContextForObject({
      objectId: root.id,
      tenantId: "tenant_a",
    });

    expect(context).toHaveLength(1);
    expect(context[0]?.objectId).toBe(strongNeighbor.id);
    expect(context[0]?.retrievalMethod).toBe("graph");
  });

  it("returns no context for an isolated object", async () => {
    const { objectRepository, contextRetriever } = await setup();

    const isolated = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "No relationships yet",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const context = await contextRetriever.retrieveContextForObject({
      objectId: isolated.id,
      tenantId: "tenant_a",
    });

    expect(context).toEqual([]);
  });
});
