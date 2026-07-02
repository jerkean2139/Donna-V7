import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant";
import { cognitiveObjectRepository } from "@/lib/repositories";
import { getTenantCognitiveObject, listTenantCognitiveObjects } from "@/lib/cognitive-object/service";
import { RelationshipForm } from "./relationship-form";

interface NewRelationshipPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewRelationshipPage({ params }: NewRelationshipPageProps) {
  const { id } = await params;
  const tenant = await getTenantContext();
  const object = await getTenantCognitiveObject(cognitiveObjectRepository, id, tenant.tenantId);

  if (!object) {
    notFound();
  }

  const tenantObjects = await listTenantCognitiveObjects(cognitiveObjectRepository, tenant.tenantId);
  const candidates = tenantObjects
    .filter((candidate) => candidate.id !== object.id)
    .map((candidate) => ({ id: candidate.id, title: candidate.title, objectType: candidate.objectType }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link className="text-sm text-slate-600 underline" href={`/cognitive-objects/${object.id}`}>
        ← Back to {object.title}
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Add relationship</h1>
      <p className="mt-3 text-slate-700">
        Connect <span className="font-semibold">{object.title}</span> to another Cognitive Object in
        your workspace so the graph can reason across them.
      </p>

      {candidates.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-slate-700">
          There are no other Cognitive Objects in this workspace yet.{" "}
          <Link className="font-medium underline" href="/cognitive-objects/new">
            Create another object
          </Link>{" "}
          first, then come back to relate them.
        </div>
      ) : (
        <RelationshipForm fromObjectId={object.id} candidates={candidates} />
      )}
    </main>
  );
}
