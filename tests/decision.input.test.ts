import { createDecisionFormSchema } from "../src/lib/decision/input";

describe("createDecisionFormSchema", () => {
  it("requires an objective", () => {
    const result = createDecisionFormSchema.safeParse({
      title: "Choose a database host",
      objective: "",
      riskLevel: "medium",
    });

    expect(result.success).toBe(false);
  });

  it("parses a valid decision and splits tags", () => {
    const parsed = createDecisionFormSchema.parse({
      title: "Choose a database host",
      objective: "Decide where to run Postgres.",
      riskLevel: "high",
      tags: "infra, db,  cost ",
    });

    expect(parsed.title).toBe("Choose a database host");
    expect(parsed.objective).toBe("Decide where to run Postgres.");
    expect(parsed.riskLevel).toBe("high");
    expect(parsed.tags).toEqual(["infra", "db", "cost"]);
  });

  it("defaults risk to low and tags to empty", () => {
    const parsed = createDecisionFormSchema.parse({
      title: "A small reversible call",
      objective: "Decide the button label.",
    });

    expect(parsed.riskLevel).toBe("low");
    expect(parsed.tags).toEqual([]);
  });
});
