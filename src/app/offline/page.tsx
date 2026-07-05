import Link from "next/link";

// Shown by the service worker when a navigation fails with no network.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span
        aria-hidden="true"
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-500"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 20h.01" strokeLinecap="round" />
          <path d="m3 3 18 18" strokeLinecap="round" />
        </svg>
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">You&apos;re offline</h1>
      <p className="mt-3 text-slate-600">
        Donna needs a connection to load your workspace. Check your network and try again.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-slate-950 px-5 py-3 text-sm text-white"
      >
        Retry
      </Link>
    </main>
  );
}
