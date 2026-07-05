import { getTenantPlan } from "../auth/plan";
import { agentRunRepository, evolutionLoopRunRepository } from "../repositories";
import {
  assertWithinAiRunQuota,
  evaluateAiRunQuota,
  startOfMonthUtc,
  type AiRunQuota,
} from "./plans";

// One AI-run counter, summed across both paid AI operations: agent tasks and
// Evolution Loop runs. Counting only one would let a tenant bypass the cap via
// the other, and would misreport usage on the billing page.
async function countAiRunsThisMonth(tenantId: string): Promise<number> {
  const since = startOfMonthUtc(new Date());
  const [agentRuns, loopRuns] = await Promise.all([
    agentRunRepository.countForTenantSince(tenantId, since),
    evolutionLoopRunRepository.countForTenantSince(tenantId, since),
  ]);
  return agentRuns + loopRuns;
}

// App-boundary quota enforcement: resolve the tenant's Clerk plan, count this
// month's AI runs, and throw PlanLimitError when over. The plan gate (cost)
// sits beside governance (risk) at the same action boundary.
export async function assertAiRunQuota(tenantId: string): Promise<void> {
  const tier = await getTenantPlan();
  assertWithinAiRunQuota(tier, await countAiRunsThisMonth(tenantId));
}

// Billing page: the same measurement, returned as a snapshot instead of a throw.
export async function getAiRunQuota(tenantId: string): Promise<AiRunQuota> {
  const tier = await getTenantPlan();
  return evaluateAiRunQuota(tier, await countAiRunsThisMonth(tenantId));
}
