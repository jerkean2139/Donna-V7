import {
  InMemoryOutcomeRepository,
  toCreateOutcomeValues,
  toOutcome,
} from "../src/lib/outcome/repository";

describe("in-memory outcome repository", () => {
  it("scopes outcomes to tenant and object, newest first", async () => {
    const repository = new InMemoryOutcomeRepository();

    await repository.create({
      tenantId: "tenant_a",
      objectId: "obj_1",
      outcomeSummary: "Shipped on Railway.",
      successScore: 80,
    });
    await repository.create({
      tenantId: "tenant_a",
      objectId: "obj_1",
      outcomeSummary: "Follow-up: revisit scaling.",
      followUpRequired: true,
    });
    await repository.create({
      tenantId: "tenant_b",
      objectId: "obj_1",
      outcomeSummary: "Other tenant outcome.",
    });

    const outcomes = await repository.listByObjectForTenant("obj_1", "tenant_a");

    expect(outcomes).toHaveLength(2);
    expect(outcomes.every((outcome) => outcome.tenantId === "tenant_a")).toBe(true);
  });
});

describe("drizzle outcome repository mapping", () => {
  it("builds insert values with defaults", () => {
    const values = toCreateOutcomeValues({
      tenantId: "tenant_a",
      objectId: "obj_1",
      outcomeSummary: "Executed and reviewed.",
    });

    expect(values.tenantId).toBe("tenant_a");
    expect(values.successScore).toBeNull();
    expect(values.lessonLearned).toBeNull();
    expect(values.followUpRequired).toBe(false);
  });

  it("maps a stored row back to an outcome", () => {
    const createdAt = new Date("2026-07-01T12:00:00.000Z");
    const outcome = toOutcome({
      id: "out_1",
      tenantId: "tenant_a",
      objectId: "obj_1",
      outcomeSummary: "Executed and reviewed.",
      successScore: 88,
      lessonLearned: "Confirm cost estimates earlier.",
      followUpRequired: true,
      createdAt,
    });

    expect(outcome.successScore).toBe(88);
    expect(outcome.lessonLearned).toBe("Confirm cost estimates earlier.");
    expect(outcome.followUpRequired).toBe(true);
    expect(outcome.createdAt).toBe(createdAt);
  });
});
