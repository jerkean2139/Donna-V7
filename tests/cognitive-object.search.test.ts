import { filterCognitiveObjects } from "../src/lib/cognitive-object/search";
import type { CognitiveObject } from "../src/lib/cognitive-object/types";

function makeObject(overrides: Partial<CognitiveObject>): CognitiveObject {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    tenantId: "tenant_a",
    createdByUserId: "user_1",
    objectType: "memory",
    title: "Untitled",
    status: "active",
    source: "manual",
    riskLevel: "low",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

const objects = [
  makeObject({ id: "a", objectType: "decision", title: "Choose deployment host", objective: "Decide Railway vs AWS." }),
  makeObject({ id: "b", objectType: "research", title: "Competitor pricing", summary: "Survey of market rates." }),
  makeObject({ id: "c", objectType: "decision", title: "Hiring plan", summary: "Q3 headcount." }),
];

describe("filterCognitiveObjects", () => {
  it("returns everything when no filter is applied", () => {
    expect(filterCognitiveObjects(objects, {})).toHaveLength(3);
    expect(filterCognitiveObjects(objects, { objectType: "all" })).toHaveLength(3);
  });

  it("narrows by type", () => {
    const result = filterCognitiveObjects(objects, { objectType: "decision" });
    expect(result.map((object) => object.id)).toEqual(["a", "c"]);
  });

  it("matches the query against title, summary, and objective, case-insensitively", () => {
    expect(filterCognitiveObjects(objects, { query: "RAILWAY" }).map((o) => o.id)).toEqual(["a"]);
    expect(filterCognitiveObjects(objects, { query: "market" }).map((o) => o.id)).toEqual(["b"]);
    expect(filterCognitiveObjects(objects, { query: "plan" }).map((o) => o.id)).toEqual(["c"]);
  });

  it("combines type and query", () => {
    const result = filterCognitiveObjects(objects, { objectType: "decision", query: "host" });
    expect(result.map((object) => object.id)).toEqual(["a"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterCognitiveObjects(objects, { query: "nonexistent" })).toEqual([]);
  });
});
