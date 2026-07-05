"use client";

// Root error boundary. Server error messages are masked by Next.js in
// production, so keep this generic and offer a retry.
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Something went wrong</h1>
      <p className="mt-3 text-muted">
        The request could not be completed. Nothing was saved. Try again, and if the problem
        keeps happening let the team know what you were doing.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-[#06080f]"
      >
        Try again
      </button>
    </main>
  );
}
