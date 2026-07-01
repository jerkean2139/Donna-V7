import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Manumation Intelligence Layer
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
        Donna V7 turns work into Cognitive Objects.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
        Cognitive Objects capture decisions, research, meetings, proposals,
        issues, lessons, and memory. The Cognitive Graph connects them so Donna
        can help the team reason across context.
      </p>
      <div className="mt-8 flex gap-4">
        <Link className="rounded-lg bg-slate-950 px-5 py-3 text-white" href="/dashboard">
          Open dashboard
        </Link>
        <Link className="rounded-lg border border-slate-300 px-5 py-3" href="/cognitive-objects">
          View objects
        </Link>
      </div>
    </main>
  );
}
