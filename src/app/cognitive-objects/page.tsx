import Link from "next/link";
import { getTenantContext } from "@/lib/auth/tenant";
import { cognitiveObjectRepository } from "@/lib/repositories";
import { listTenantCognitiveObjects } from "@/lib/cognitive-object/service";

export default async function CognitiveObjectsPage() {
  const tenant = await getTenantContext();
  const objects = await listTenantCognitiveObjects(cognitiveObjectRepository, tenant.tenantId);

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
            No Cognitive Objects yet. Create the first one to begin building organizational intelligence.
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
    </main>
  );
}
