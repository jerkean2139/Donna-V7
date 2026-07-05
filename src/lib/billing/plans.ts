import { DomainError } from "../errors";

// Plan tiers mirror VYBEKODERZ-OS's billing/limits.ts. The tier a tenant is
// on comes from Clerk Billing (see src/lib/auth/plan.ts, which reads
// has({ plan })); this module owns the numeric caps + feature flags that
// Clerk does not meter for us. Slugs must match the plan slugs configured in
// the Clerk dashboard. "starter" is the implicit free/default tier -- a
// tenant with no paid plan resolves to it.
export type PlanTier = "starter" | "pro" | "enterprise";

export const UNLIMITED = -1;

export interface PlanLimits {
  // Metered + enforced at the action boundary (this PR). An "AI run" is any
  // paid AI operation -- an agent task OR an Evolution Loop run -- so both
  // count against this one cap.
  maxAiRunsPerMonth: number;
  // Declared for display; enforcement wired incrementally (maxEnabledAgents
  // rides on the deferred per-tenant enable/disable work; feedbackWidget gates
  // the Phase 3 widget). Kept here so the whole plan is in one place.
  maxEnabledAgents: number;
  teamSeats: number;
  feedbackWidget: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  starter: {
    maxAiRunsPerMonth: 100,
    maxEnabledAgents: 5,
    teamSeats: 2,
    feedbackWidget: false,
  },
  pro: {
    maxAiRunsPerMonth: 1000,
    maxEnabledAgents: 10,
    teamSeats: 10,
    feedbackWidget: true,
  },
  enterprise: {
    maxAiRunsPerMonth: UNLIMITED,
    maxEnabledAgents: UNLIMITED,
    teamSeats: UNLIMITED,
    feedbackWidget: true,
  },
};

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier] ?? PLAN_LIMITS.starter;
}

export function isUnlimited(value: number): boolean {
  return value === UNLIMITED;
}

// The plan gate is a sibling of governance: governance gates *risk*, the plan
// gate gates *cost*. Both sit at the same action boundary. PlanLimitError is a
// DomainError so its message surfaces to the user ("upgrade to continue")
// rather than leaking as an opaque 500.
export class PlanLimitError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

// First instant of the current UTC month -- the metering window for run caps.
export function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export interface AiRunQuota {
  tier: PlanTier;
  used: number;
  limit: number;
  remaining: number;
  withinLimit: boolean;
}

export function evaluateAiRunQuota(tier: PlanTier, usedThisMonth: number): AiRunQuota {
  const limit = getPlanLimits(tier).maxAiRunsPerMonth;
  if (isUnlimited(limit)) {
    return { tier, used: usedThisMonth, limit, remaining: UNLIMITED, withinLimit: true };
  }
  return {
    tier,
    used: usedThisMonth,
    limit,
    remaining: Math.max(0, limit - usedThisMonth),
    withinLimit: usedThisMonth < limit,
  };
}

export function assertWithinAiRunQuota(tier: PlanTier, usedThisMonth: number): void {
  const quota = evaluateAiRunQuota(tier, usedThisMonth);
  if (!quota.withinLimit) {
    throw new PlanLimitError(
      `Monthly AI-run limit reached (${quota.limit} on the ${tier} plan). Upgrade to run more.`,
    );
  }
}
