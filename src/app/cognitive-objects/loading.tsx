export default function CognitiveObjectsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10" aria-busy="true" aria-live="polite">
      <div className="h-9 w-72 animate-pulse rounded-lg bg-white/5" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    </main>
  );
}
