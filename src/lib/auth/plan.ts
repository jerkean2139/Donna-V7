import { auth } from "@clerk/nextjs/server";
import type { PlanTier } from "../billing/plans";

// Resolves the active organization's plan from Clerk Billing. Clerk owns
// subscription state (and the Stripe relationship underneath); we only read
// the entitlement via has({ plan }). Checked high-to-low; a tenant with no
// paid plan falls through to the free "starter" tier -- a safe default that
// also means the whole billing layer no-ops cleanly until plans are
// configured in the Clerk dashboard.
export async function getTenantPlan(): Promise<PlanTier> {
  const { has } = await auth();
  if (has({ plan: "enterprise" })) return "enterprise";
  if (has({ plan: "pro" })) return "pro";
  return "starter";
}
