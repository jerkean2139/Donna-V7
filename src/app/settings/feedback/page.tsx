import { headers } from "next/headers";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { feedbackWidgetKeyRepository } from "@/lib/repositories";
import { listWidgetKeys } from "@/lib/feedback/service";
import { MintForm } from "./mint-form";
import { SnippetBlock } from "./snippet-block";
import { revokeWidgetKeyAction } from "./actions";

function buildSnippet(baseUrl: string, publicKey: string): string {
  return `<script src="${baseUrl}/feedback-widget.js" data-donna-key="${publicKey}" defer></script>`;
}

export default async function FeedbackSettingsPage() {
  const tenant = await tryGetTenantContext();
  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  const [keys, headerList] = await Promise.all([
    listWidgetKeys(feedbackWidgetKeyRepository, tenant.tenantId),
    headers(),
  ]);

  const host = headerList.get("host") ?? "your-donna-host";
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold tracking-wide text-text-primary">Feedback widget</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        Drop a feedback button on any site. Submissions arrive as low-trust Cognitive Objects in this
        workspace — you triage them like anything else. Widget keys are public by design (they ship in
        a script tag); they only authorize creating feedback for this workspace, nothing more.
      </p>

      <section className="mt-8 rounded-xl border border-border-default bg-bg-surface-1 p-5">
        <h2 className="font-display text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
          Create a key
        </h2>
        <div className="mt-4">
          <MintForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
          Your keys
        </h2>
        {keys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-default bg-bg-surface-1 p-8 text-center text-sm text-text-secondary">
            No widget keys yet. Create one above to get an embed snippet.
          </div>
        ) : (
          <ul className="space-y-4">
            {keys.map((key) => {
              const revoked = key.revokedAt !== null;
              return (
                <li key={key.id} className="rounded-xl border border-border-default bg-bg-surface-1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-semibold text-text-primary">
                          {key.label}
                        </span>
                        {revoked ? (
                          <span className="rounded-full border border-border-default bg-bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-text-muted">
                            revoked
                          </span>
                        ) : (
                          <span className="rounded-full border border-mint/30 bg-[var(--mint-dim)] px-2 py-0.5 font-mono text-[10px] text-mint">
                            active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-all font-mono text-[11px] text-text-muted">{key.publicKey}</p>
                      <p className="mt-1 font-mono text-[10px] text-text-muted">
                        {key.allowedOrigins.length === 0
                          ? "any origin"
                          : key.allowedOrigins.join(", ")}
                      </p>
                    </div>
                    {!revoked && (
                      <form action={revokeWidgetKeyAction}>
                        <input type="hidden" name="keyId" value={key.id} />
                        <button
                          type="submit"
                          className="shrink-0 rounded border border-border-default bg-bg-surface-2 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-red/40 hover:text-red"
                        >
                          Revoke
                        </button>
                      </form>
                    )}
                  </div>

                  {!revoked && <SnippetBlock snippet={buildSnippet(baseUrl, key.publicKey)} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
