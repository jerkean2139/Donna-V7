import Link from "next/link";

const pillars = [
  {
    title: "Cognitive Objects",
    body: "Capture decisions, research, meetings, proposals, issues, lessons, and memory as durable, structured records — not chat that disappears into the swamp.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M3 9h18M9 21V9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Cognitive Graph",
    body: "Relationships connect objects — supports, contradicts, supersedes, depends on — so Donna can reason across the full context, not one record at a time.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="8" r="2.5" />
        <circle cx="10" cy="18" r="2.5" />
        <path d="M8 7.5 15.5 9M8.5 16 16 10M8 8l1.5 7.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Governance",
    body: "Confidence scores, risk levels, and approval gates decide when the system may recommend, draft, or execute — and when a human must sign off first.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="donna-hero">
      <main className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <p className="donna-eyebrow">MANUMATION INTELLIGENCE LAYER</p>

        <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
          Donna turns work into{" "}
          <span className="donna-gradient-text">Cognitive Objects</span>.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          The intelligence operating system for teams and AI to make better decisions
          together — capturing context, weighing risk, and remembering what mattered.
        </p>

        <div className="mt-9 flex flex-wrap gap-4">
          <Link className="donna-cta donna-cta-primary" href="/dashboard">
            Open dashboard
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link className="donna-cta donna-cta-ghost" href="/cognitive-objects">
            View objects
          </Link>
          <Link className="donna-cta donna-cta-ghost" href="/decisions">
            View decisions
          </Link>
        </div>

        <section aria-label="What Donna does" className="mt-16 grid gap-4 sm:grid-cols-3">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="donna-pillar">
              <span className="donna-pillar-icon">{pillar.icon}</span>
              <h3 className="mt-4 font-semibold">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{pillar.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
