import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import type { IntegrationProvider } from "@/lib/integrations/credentials/types";
import { getIntegrationCredentialStatuses } from "./actions";
import { CredentialForm } from "./credential-form";

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  ghl: "GoHighLevel (GHL)",
  resend: "Resend",
};

const PROVIDER_HELP: Record<IntegrationProvider, string> = {
  ghl: "Powers the GHL Funnels and GHL Campaigns agents' ghl_read and ghl_write tools.",
  resend: "Powers the send_email tool for agents whose deliverable is an email.",
};

export default async function IntegrationsPage() {
  const tenant = await tryGetTenantContext();
  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  const statuses = await getIntegrationCredentialStatuses();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Integrations</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        API keys are encrypted at rest and used only for this workspace&apos;s agent actions. Nothing
        here is ever shown back once saved.
      </p>

      <div className="mt-8 space-y-6">
        {statuses.map((status) => (
          <section key={status.provider} className="rounded-xl border border-border-default p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-text-primary">{PROVIDER_LABELS[status.provider]}</h2>
                <p className="mt-1 text-sm text-text-secondary">{PROVIDER_HELP[status.provider]}</p>
              </div>
              <span
                className={
                  status.configured
                    ? "shrink-0 rounded-full bg-[var(--mint-dim)] px-3 py-1 text-xs font-medium text-mint"
                    : "shrink-0 rounded-full bg-bg-surface-2 px-3 py-1 text-xs font-medium text-text-secondary"
                }
              >
                {status.configured ? "Configured" : "Not configured"}
              </span>
            </div>

            <div className="mt-4">
              <CredentialForm provider={status.provider} configured={status.configured} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
