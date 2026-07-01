export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
      <p className="mt-3 max-w-2xl text-slate-700">
        This is the first dashboard shell for the Manumation Intelligence Layer.
        The next slice should connect this page to real Cognitive Object data.
      </p>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold">Open Objects</h2>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold">Approvals Needed</h2>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold">Graph Links</h2>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
      </section>
    </main>
  );
}
