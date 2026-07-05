export default function CognitiveObjectDetailLoading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10" aria-busy="true" aria-live="polite">
      <div className="h-6 w-40 animate-pulse rounded-full bg-bg-surface-2" />
      <div className="mt-4 h-9 w-96 animate-pulse rounded-lg bg-bg-surface-2" />
      <div className="mt-8 space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-xl bg-bg-surface-2" />
        ))}
      </div>
    </main>
  );
}
