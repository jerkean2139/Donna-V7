import Link from "next/link";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { cognitiveObjectRepository } from "@/lib/repositories";
import { listTenantCognitiveObjects } from "@/lib/cognitive-object/service";

const PAGE_SIZE = 50;

interface CognitiveObjectsPageProps {
  searchParams: Promise<{ page?: string }>;
}

function parsePage(raw: string | undefined): number {
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export default async function CognitiveObjectsPage({ searchParams }: CognitiveObjectsPageProps) {
  const tenant = await tryGetTenantContext();

  if (!tenant) {
    return <SelectOrganizationNotice />;
  }

  const { page } = await searchParams;
  const currentPage = parsePage(page);

  // Fetch one extra row beyond the page to know whether a next page exists
  // without a separate count query.
  const rows = await listTenantCognitiveObjects(cognitiveObjectRepository, tenant.tenantId, {
    limit: PAGE_SIZE + 1,
    offset: (currentPage - 1) * PAGE_SIZE,
  });
  const objects = rows.slice(0, PAGE_SIZE);
  const hasNextPage = rows.length > PAGE_SIZE;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Cognitive Objects</h1>
          <p className="mt-3 max-w-2xl text-slate-700">
            Cognitive Objects are the universal intelligence records for Donna V7.
          </p>
        </div>
        <Link className="rounded-lg bg-slate-950 px-5 py-3 text-white" href="/cognitive-objects/new">
          New object
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {objects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-slate-700">
            {currentPage === 1
              ? "No Cognitive Objects yet. Create the first one to begin building organizational intelligence."
              : "No Cognitive Objects on this page."}
          </div>
        ) : (
          objects.map((object) => (
            <Link
              key={object.id}
              href={`/cognitive-objects/${object.id}`}
              className="block rounded-xl border border-slate-200 p-5 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold">{object.title}</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-700">
                  {object.objectType}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{object.summary ?? "No summary yet."}</p>
            </Link>
          ))
        )}
      </div>

      {(currentPage > 1 || hasNextPage) && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
          {currentPage > 1 ? (
            <Link
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              href={`/cognitive-objects?page=${currentPage - 1}`}
              rel="prev"
            >
              ← Newer
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          <span className="text-sm text-slate-600">Page {currentPage}</span>
          {hasNextPage ? (
            <Link
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              href={`/cognitive-objects?page=${currentPage + 1}`}
              rel="next"
            >
              Older →
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
        </nav>
      )}
    </main>
  );
}
