import Link from "next/link";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { conversationRepository } from "@/lib/console/repository";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import type { ConsoleMessage } from "@/lib/console/types";
import { Composer } from "./composer";

export const metadata = {
  title: "Donna Console | Donna V7",
};

function DonnaAvatar() {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-xs font-bold text-[#06080f]"
    >
      D
    </span>
  );
}

function AgentPill({ name }: { name: string }) {
  const dept = AGENT_REGISTRY[name]?.department;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-cyan-200 ring-1 ring-inset ring-cyan-400/25">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> {name}
      {dept ? <span className="text-faint">· {dept}</span> : null}
    </span>
  );
}

function AgentAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-cyan-200 ring-1 ring-inset ring-cyan-400/30"
    >
      {name.slice(0, 1)}
    </span>
  );
}

function MessageRow({ message }: { message: ConsoleMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-to-br from-cyan-400/90 to-indigo-500/90 px-4 py-2.5 text-sm text-[#06080f]">
          {message.content}
        </div>
      </div>
    );
  }

  // An agent speaking after Donna handed the work to them.
  if (message.role === "agent") {
    return (
      <div className="flex items-start gap-3">
        <AgentAvatar name={message.agentName ?? "?"} />
        <div className="max-w-[85%]">
          {message.agentName && (
            <div className="mb-1 flex items-center gap-2">
              <AgentPill name={message.agentName} />
            </div>
          )}
          <div className="rounded-2xl rounded-tl-sm border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-2.5 text-sm leading-6 text-ink whitespace-pre-wrap">
            {message.content}
          </div>
          {message.objectId && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={`/console/hub/${message.objectId}`}
                className="inline-flex items-center gap-1 rounded-lg border border-hairline px-2.5 py-1 text-muted transition-colors hover:border-accent/40 hover:text-ink"
              >
                Open work hub →
              </Link>
              {message.proposedActionCount > 0 && (
                <span className="rounded-full bg-amber-400/12 px-2.5 py-1 font-medium text-amber-300 ring-1 ring-inset ring-amber-400/30">
                  {message.proposedActionCount} action{message.proposedActionCount === 1 ? "" : "s"} awaiting approval
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Donna's own messages.
  return (
    <div className="flex items-start gap-3">
      <DonnaAvatar />
      <div className="max-w-[80%]">
        <div className="donna-card rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-ink">
          {message.content}
        </div>
        {message.agentName && (
          <div className="mt-2 flex items-center gap-2 text-xs text-faint">
            <span>Routed to</span>
            <AgentPill name={message.agentName} />
          </div>
        )}
      </div>
    </div>
  );
}

export default async function ConsolePage() {
  const tenant = await tryGetTenantContext();

  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  const conversation = await conversationRepository.getOrCreateActive(tenant.tenantId);
  const messages = await conversationRepository.listMessages(conversation.id, tenant.tenantId);

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col px-6 py-8">
      <div className="donna-reveal">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Donna Console</p>
        <h1 className="donna-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Talk to Donna
        </h1>
        <p className="mt-2 text-sm text-muted">
          Describe what you need. Donna answers directly or calls a specialist from the Agent Mob
          into the conversation, then hands the work to their hub.
        </p>
      </div>

      <div className="mt-6 flex-1 space-y-4">
        {messages.length === 0 ? (
          <div className="donna-card donna-reveal rounded-2xl p-6 text-center" style={{ animationDelay: "80ms" }}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-lg font-bold text-[#06080f]">
              D
            </div>
            <p className="mt-4 font-semibold text-ink">Hi, I&apos;m Donna.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              I coordinate a team of specialist agents. Try{" "}
              <span className="text-cyan-200">&ldquo;research our top competitor&rsquo;s pricing&rdquo;</span>{" "}
              or <span className="text-cyan-200">&ldquo;draft a refund reply for an upset customer&rdquo;</span>{" "}
              and watch me route it.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {Object.keys(AGENT_REGISTRY).map((name) => (
                <AgentPill key={name} name={name} />
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => <MessageRow key={message.id} message={message} />)
        )}
      </div>

      <div className="sticky bottom-4 mt-6">
        <Composer />
        <p className="mt-2 text-center text-xs text-faint">
          Donna routes to specialists; side-effecting actions still require your approval.
        </p>
      </div>
    </main>
  );
}
