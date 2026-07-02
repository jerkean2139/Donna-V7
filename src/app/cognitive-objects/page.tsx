import Link from "next/link";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { cognitiveObjectRepository } from "@/lib/repositories";
import { MAX_LIST_LIMIT } from "@/lib/cognitive-object/repository";
import { listTenantCognitiveObjects } from "@/lib/cognitive-object/service";
import { filterCognitiveObjects } from "@/lib/cognitive-object/search";
import { cognitiveObjectTypes, type CognitiveObjectType } from "@/lib/cognitive-object/types";
import type { CognitiveObject } from "@/lib/cognitive-object/types";

const PAGE_SIZE = 50;

interface CognitiveObjectsPageProps {
  searchParams: Promise<{ page?: string; q?: string; type?: string }>;
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

  const { page, q, type } = await searchParams;
  const currentPage = parsePage(page);
  const selectedType: CognitiveObjectType | "all" =
    type && (cognitiveObjectTypes as readonly string[]).includes(type)
      ? (type as CognitiveObjectType)
      : "all";
  const isFiltering = Boolean(q?.trim()) || selectedType !== "all";

  let objects: CognitiveObject[];
  let totalFetched: number;
  let hasNextPage = false;

  if (isFiltering) {
    // Filtering searches across the newest MAX_LIST_LIMIT objects in one go;
    // pagination is hidden while a filter is active.
    const rows = await listTenantCognitiveObjects(cognitiveObjectRepository, tenant.tenantId, {
      limit: MAX_LIST_LIMIT,
    });
    totalFetched = rows.length;
    objects = filterCognitiveObjects(rows, { query: q, objectType: selectedType });
  } else {
    // Fetch one extra row beyond the page to know whether a next page exists
    // without a separate count query.
    const rows = await listTenantCognitiveObjects(cognitiveObjectRepository, tenant.tenantId, {
      limit: PAGE_SIZE + 1,
      offset: (currentPage - 1) * PAGE_SIZE,
    });
    objects = rows.slice(0, PAGE_SIZE);
    totalFetched = objects.length;
    hasNextPage = rows.length > PAGE_SIZE;
  }

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

      <form className="mt-8 flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="text-xs font-medium text-slate-600">Search</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search title, summary, objective…"
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Type</span>
          <select
            name="type"
            defaultValue={selectedType}
            className="mt-1 rounded-lg border border-slate-300 p-2.5 text-sm capitalize"
          >
            <option value="all">All types</option>
            {cognitiveObjectTypes.map((objectType) => (
              <option key={objectType} value={objectType}>
                {objectType}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm text-white">
          Apply
        </button>
        {isFiltering && (
          <Link className="px-2 py-2.5 text-sm text-slate-500 hover:text-slate-900" href="/cognitive-objects">
            Clear
          </Link>
        )}
      </form>

      {isFiltering && (
        <p className="mt-4 text-xs text-slate-500">
          {objects.length} of {totalFetched} object{totalFetched === 1 ? "" : "s"} match
          {totalFetched >= MAX_LIST_LIMIT ? ` (searching the newest ${MAX_LIST_LIMIT})` : ""}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {objects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-slate-700">
            {isFiltering
              ? "No objects match your filter."
              : currentPage === 1
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

      {!isFiltering && (currentPage > 1 || hasNextPage) && (
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
