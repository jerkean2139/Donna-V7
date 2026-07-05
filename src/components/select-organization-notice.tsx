import { OrganizationSwitcher } from "@clerk/nextjs";

// Rendered by tenant-scoped pages when the signed-in user has not selected an
// active Clerk organization yet. All tenant data is keyed by organization, so
// nothing can be shown until one is active.
export function SelectOrganizationNotice() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <span
        aria-hidden="true"
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">Choose a workspace</h1>
      <p className="mt-3 max-w-md text-slate-600">
        Donna keeps every workspace&apos;s intelligence fully separated. Select or create an
        organization to continue.
      </p>

      <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/dashboard"
        />
      </div>
    </main>
  );
}
