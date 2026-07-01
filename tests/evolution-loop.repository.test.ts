import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";
import { InMemoryEvolutionLoopRunRepository } from "../src/lib/evolution-loop/repository";
import {
  listEvolutionLoopRunsForObject,
  startEvolutionLoopForObject,
} from "../src/lib/evolution-loop/service";

describe("evolution loop run repository", () => {
  it("lists loop runs only for the active tenant and object", async () => {
    const objectRepository = new InMemoryCognitiveObjectRepository();
    const loopRepository = new InMemoryEvolutionLoopRunRepository();

    const tenantAObject = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Choose the MVP loop storage path",
      summary: "Decide how loop history should be stored for Cognitive Objects.",
      body: "The MVP should keep loop history tenant-scoped and attached to a Cognitive Object.",
      source: "manual",
      riskLevel: "medium",
      tags: ["loop"],
    });

    const otherTenantObject = await objectRepository.create({
      tenantId: "tenant_b",
      createdByUserId: "user_2",
      objectType: "decision",
      title: "Private tenant B decision",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    await startEvolutionLoopForObject(objectRepository, loopRepository, {
      objectId: tenantAObject.id,
      tenantId: "tenant_a",
    });
    await startEvolutionLoopForObject(objectRepository, loopRepository, {
      objectId: otherTenantObject.id,
      tenantId: "tenant_b",
    });

    const tenantAHistory = await listEvolutionLoopRunsForObject(loopRepository, {
      objectId: tenantAObject.id,
      tenantId: "tenant_a",
    });

    expect(tenantAHistory).toHaveLength(1);
    expect(tenantAHistory[0]?.tenantId).toBe("tenant_a");
    expect(tenantAHistory[0]?.objectId).toBe(tenantAObject.id);

    const crossTenantHistory = await listEvolutionLoopRunsForObject(loopRepository, {
      objectId: tenantAObject.id,
      tenantId: "tenant_b",
    });

    expect(crossTenantHistory).toEqual([]);
  });

  it("does not start a loop run for an object outside the active tenant", async () => {
    const objectRepository = new InMemoryCognitiveObjectRepository();
    const loopRepository = new InMemoryEvolutionLoopRunRepository();

    const created = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "research",
      title: "Tenant A research",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    await expect(
      startEvolutionLoopForObject(objectRepository, loopRepository, {
        objectId: created.id,
        tenantId: "tenant_b",
      }),
    ).rejects.toThrow("Cognitive Object not found for active tenant.");
  });
});
