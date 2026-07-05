"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Root-of-root error boundary. Next.js only invokes this when an error
// escapes the layout tree itself (error.tsx covers everything below the
// root layout) -- it must render its own <html>/<body> since the normal
// layout may not have mounted. Sentry needs this file specifically to catch
// errors error.tsx cannot.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Something went wrong</h1>
          <p className="mt-3 text-slate-700">
            The app hit an unexpected error and could not recover. Reloading the page usually
            fixes this; if it keeps happening, let the team know what you were doing.
          </p>
        </main>
      </body>
    </html>
  );
}
