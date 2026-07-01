import Link from "next/link";
import { getTenantContext } from "@/lib/auth/tenant";
import { cognitiveObjectRepository } from "@/lib/repositories";
import { listTenantCognitiveObjects } from "@/lib/cognitive-object/service";
import { filterCognitiveObjects } from "@/lib/cognitive-object/search";
import { cognitiveObjectTypes } from "@/lib/cognitive-object/types";

interface CognitiveObjectsPageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

export default async function CognitiveObjectsPage({ searchParams }: CognitiveObjectsPageProps) {
  const { q, type } = await searchParams;
  const tenant = await getTenantContext();
  const objects = await listTenantCognitiveObjects(cognitiveObjectRepository, tenant.tenantId);

  const selectedType = type && cognitiveObjectTypes.includes(type as never) ? type : "all";
  const filtered = filterCognitiveObjects(objects, {
    query: q,
    objectType: selectedType as never,
  });

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
        {(q || selectedType !== "all") && (
          <Link className="px-2 py-2.5 text-sm text-slate-500 hover:text-slate-900" href="/cognitive-objects">
            Clear
          </Link>
        )}
      </form>

      <p className="mt-4 text-xs text-slate-500">
        {filtered.length} of {objects.length} object{objects.length === 1 ? "" : "s"}
      </p>

      <div className="mt-4 space-y-4">
        {objects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-slate-700">
            No Cognitive Objects yet. Create the first one to begin building organizational intelligence.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-slate-700">
            No objects match your filter.
          </div>
        ) : (
          filtered.map((object) => (
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
    </main>
  );
}
