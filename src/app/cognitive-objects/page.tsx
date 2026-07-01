const objectTypes = [
  "decision",
  "research",
  "meeting",
  "proposal",
  "issue",
  "lesson",
  "memory",
];

export default function CognitiveObjectsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Cognitive Objects</h1>
      <p className="mt-3 max-w-2xl text-slate-700">
        Cognitive Objects are the universal intelligence records for Donna V7.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {objectTypes.map((type) => (
          <div key={type} className="rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold capitalize">{type.replace("_", " ")}</h2>
            <p className="mt-2 text-sm text-slate-600">Ready for schema-backed records.</p>
          </div>
        ))}
      </div>
    </main>
  );
}
