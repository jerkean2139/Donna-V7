import Link from "next/link";

export const metadata = {
  title: "How Donna Works | Donna V7",
  description: "The Cognitive Object model — capture, reason, govern, act, and learn.",
};

const objectTypes = [
  { name: "Decision", body: "A choice being made — the flagship record, with a full reasoning trail." },
  { name: "Research", body: "Findings, analysis, and competitive intel worth keeping." },
  { name: "Meeting", body: "Notes and action items captured from a call." },
  { name: "Proposal", body: "Something being pitched, scoped, or planned." },
  { name: "Issue", body: "A problem or risk to track over time." },
  { name: "Lesson", body: "Something learned that should shape future work." },
  { name: "Memory", body: "A durable fact or piece of context to retain." },
];

const lifecycle = [
  {
    step: "1",
    title: "Capture",
    body: "Record a meaningful unit of work as a structured Cognitive Object — an objective, risk level, and context — instead of losing it in chat.",
  },
  {
    step: "2",
    title: "Reason",
    body: "Run the Evolution Loop. Donna surfaces assumptions, options, a critique, risks, a recommendation, and a 0–100 confidence score.",
  },
  {
    step: "3",
    title: "Govern",
    body: "Governance decides when a human must approve — high risk, low confidence, external comms, deletions, money, or legal.",
  },
  {
    step: "4",
    title: "Act",
    body: "Once approved, the recommendation is a release candidate ready to execute — with a full audit trail of how it got there.",
  },
  {
    step: "5",
    title: "Learn",
    body: "Record the outcome and the lesson. The system remembers what happened, so the next decision starts smarter.",
  },
];

const relationships = ["supports", "contradicts", "supersedes", "depends on", "caused by", "resulted in"];

export default function GuidePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <div className="donna-reveal">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">The Intelligence Layer</p>
        <h1 className="donna-display mt-2 text-4xl font-bold tracking-tight sm:text-6xl">How Donna works</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
          Most tools generate answers and forget them. Donna is built on one idea:{" "}
          <span className="text-ink">memory is more valuable than response.</span> Everything that
          matters becomes a durable, structured record you and the AI can reason over — forever.
        </p>
      </div>

      {/* Cognitive Object */}
      <section className="donna-reveal mt-16" style={{ animationDelay: "80ms" }}>
        <h2 className="text-2xl font-bold tracking-tight text-ink">The Cognitive Object</h2>
        <p className="mt-3 max-w-3xl text-muted">
          The atomic unit of the whole system — one meaningful unit of work, captured in a structured,
          durable form. Every object carries the same skeleton: a type, an objective, a status, a risk
          level, a confidence score, and tags. It always lives inside one workspace, fully separated
          from every other tenant.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {objectTypes.map((type, index) => (
            <div
              key={type.name}
              className="donna-card donna-card-hover donna-reveal rounded-2xl p-4"
              style={{ animationDelay: `${120 + index * 50}ms` }}
            >
              <h3 className="font-semibold text-ink">{type.name}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{type.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lifecycle */}
      <section className="donna-reveal mt-16" style={{ animationDelay: "120ms" }}>
        <h2 className="text-2xl font-bold tracking-tight text-ink">The lifecycle</h2>
        <p className="mt-3 max-w-3xl text-muted">
          Every meaningful decision moves through the same five stages. This is the Manumation
          Evolution Loop — quality control before an answer is trusted, and learning after it&apos;s acted on.
        </p>
        <ol className="mt-6 space-y-3">
          {lifecycle.map((stage, index) => (
            <li
              key={stage.step}
              className="donna-card donna-reveal flex gap-4 rounded-2xl p-5"
              style={{ animationDelay: `${160 + index * 60}ms` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 font-bold text-[#06080f]">
                {stage.step}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{stage.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{stage.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Graph + Governance */}
      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <div className="donna-card donna-reveal rounded-2xl p-6" style={{ animationDelay: "200ms" }}>
          <h2 className="text-xl font-bold text-ink">The Cognitive Graph</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Objects connect to each other with typed relationships, so Donna reasons across the full
            picture instead of one record at a time.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {relationships.map((rel) => (
              <span
                key={rel}
                className="rounded-full bg-white/5 px-3 py-1 text-sm text-cyan-200 ring-1 ring-inset ring-cyan-400/25"
              >
                {rel}
              </span>
            ))}
          </div>
        </div>

        <div className="donna-card donna-reveal rounded-2xl p-6" style={{ animationDelay: "240ms" }}>
          <h2 className="text-xl font-bold text-ink">Governance & confidence</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            A 0–100 confidence score estimates how trustworthy a recommendation is. Approval gates are
            mandatory for high-risk or low-confidence work, external communication, sensitive data,
            payments, deletions, and legal decisions.
          </p>
          <p className="mt-3 text-sm font-medium text-ink">Humans keep judgment. Always.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="donna-briefing donna-reveal mt-16 rounded-2xl p-8 text-center" style={{ animationDelay: "280ms" }}>
        <h2 className="donna-display text-2xl font-bold tracking-tight sm:text-3xl">Start with one decision</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Capture the next real choice your team faces, run the loop, and let Donna start building
          your organization&apos;s memory.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/decisions/new"
            className="rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 px-5 py-3 font-semibold text-[#06080f] shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)]"
          >
            Create a decision
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-hairline px-5 py-3 font-semibold text-ink transition-colors hover:border-accent/40"
          >
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
