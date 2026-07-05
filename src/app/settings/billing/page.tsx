import { PricingTable } from "@clerk/nextjs";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { getAiRunQuota } from "@/lib/billing/enforce";
import { getPlanLimits, isUnlimited } from "@/lib/billing/plans";

export default async function BillingSettingsPage() {
  const tenant = await tryGetTenantContext();
  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  const quota = await getAiRunQuota(tenant.tenantId);
  const limits = getPlanLimits(quota.tier);
  const usagePct = isUnlimited(quota.limit) ? 0 : Math.min(100, Math.round((quota.used / quota.limit) * 100));
  const near = !isUnlimited(quota.limit) && usagePct >= 80;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold tracking-wide text-text-primary">Billing</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        Your workspace is on the{" "}
        <span className="font-semibold text-text-primary capitalize">{quota.tier}</span> plan. The plan
        gate is a sibling of governance: governance gates <em>risk</em>, the plan gates <em>cost</em>.
      </p>

      <section className="mt-8 rounded-xl border border-border-default bg-bg-surface-1 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
            AI runs this month
          </h2>
          <span className={`font-mono text-[11px] ${near ? "text-amber" : "text-text-muted"}`}>
            {isUnlimited(quota.limit) ? `${quota.used} · unlimited` : `${quota.used} / ${quota.limit}`}
          </span>
        </div>
        {!isUnlimited(quota.limit) && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border-default">
            <div
              className={`h-full rounded-full ${near ? "bg-amber" : "bg-cyan"}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
        <p className="mt-3 font-mono text-[10px] text-text-muted">
          Counts agent tasks and Evolution Loop runs. Resets on the 1st (UTC).
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border-default pt-4">
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-wide text-text-muted">Enabled agents</dt>
            <dd className="font-display text-lg font-bold text-text-primary">
              {isUnlimited(limits.maxEnabledAgents) ? "∞" : limits.maxEnabledAgents}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-wide text-text-muted">Team seats</dt>
            <dd className="font-display text-lg font-bold text-text-primary">
              {isUnlimited(limits.teamSeats) ? "∞" : limits.teamSeats}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-wide text-text-muted">Feedback widget</dt>
            <dd className="font-display text-lg font-bold text-text-primary">
              {limits.feedbackWidget ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
          Plans
        </h2>
        <PricingTable for="organization" />
        <p className="mt-3 font-mono text-[10px] text-text-muted">
          Plans and prices are configured in Clerk Billing. Until they are, every workspace stays on
          the free Starter tier.
        </p>
      </section>
    </main>
  );
}
