import { OrganizationSwitcher } from "@clerk/nextjs";

// Rendered by tenant-scoped pages when the signed-in user has not selected an
// active Clerk organization yet. All tenant data is keyed by organization, so
// nothing can be shown until one is active.
export function SelectOrganizationNotice() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-slate-950">Choose a workspace</h1>
      <p className="mt-3 text-slate-700">
        Donna keeps every workspace&apos;s intelligence fully separated. Select or create an
        organization to continue.
      </p>
      <div className="mt-6">
        <OrganizationSwitcher hidePersonal />
      </div>
    </main>
  );
}
