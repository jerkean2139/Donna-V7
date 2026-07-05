import Link from "next/link";
import { tryGetTenantContext } from "@/lib/auth/tenant";
import { SelectOrganizationNotice } from "@/components/select-organization-notice";
import { cognitiveObjectRepository } from "@/lib/repositories";
import { MAX_LIST_LIMIT } from "@/lib/cognitive-object/repository";
import { listTenantCognitiveObjects } from "@/lib/cognitive-object/service";
import { filterCognitiveObjects } from "@/lib/cognitive-object/search";
import { RiskBadge, StatusBadge } from "@/components/badges";
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
      <div className="donna-reveal flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Intelligence records</p>
          <h1 className="donna-display mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Cognitive Objects</h1>
          <p className="mt-3 max-w-2xl text-muted">
            The universal intelligence records for Donna — decisions, research, meetings, and more.
          </p>
        </div>
        <Link className="donna-card-hover shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 px-5 py-3 font-semibold text-[#06080f] shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)]" href="/cognitive-objects/new">
          New object
        </Link>
      </div>

      <form className="mt-8 flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="text-xs font-medium text-muted">Search</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search title, summary, objective…"
            className="mt-1 w-full rounded-lg border border-hairline bg-surface p-2.5 text-sm text-ink placeholder:text-faint"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-muted">Type</span>
          <select
            name="type"
            defaultValue={selectedType}
            className="mt-1 rounded-lg border border-hairline bg-surface p-2.5 text-sm capitalize text-ink"
          >
            <option value="all">All types</option>
            {cognitiveObjectTypes.map((objectType) => (
              <option key={objectType} value={objectType}>
                {objectType}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-[#06080f]">
          Apply
        </button>
        {isFiltering && (
          <Link className="px-2 py-2.5 text-sm text-muted transition-colors hover:text-ink" href="/cognitive-objects">
            Clear
          </Link>
        )}
      </form>

      {isFiltering && (
        <p className="mt-4 text-xs text-faint">
          {objects.length} of {totalFetched} object{totalFetched === 1 ? "" : "s"} match
          {totalFetched >= MAX_LIST_LIMIT ? ` (searching the newest ${MAX_LIST_LIMIT})` : ""}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {objects.length === 0 ? (
          <div className="donna-card rounded-2xl border-dashed p-8 text-muted">
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
              className="donna-card donna-card-hover block rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-semibold">{object.title}</h2>
                <span className="inline-flex shrink-0 items-center rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium capitalize text-muted ring-1 ring-inset ring-white/10">
                  {object.objectType}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{object.summary ?? "No summary yet."}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={object.status} />
                <RiskBadge level={object.riskLevel} />
              </div>
            </Link>
          ))
        )}
      </div>

      {!isFiltering && (currentPage > 1 || hasNextPage) && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
          {currentPage > 1 ? (
            <Link
              className="rounded-lg border border-hairline px-4 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-ink"
              href={`/cognitive-objects?page=${currentPage - 1}`}
              rel="prev"
            >
              ← Newer
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          <span className="text-sm text-muted">Page {currentPage}</span>
          {hasNextPage ? (
            <Link
              className="rounded-lg border border-hairline px-4 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-ink"
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
