import { CreateObjectForm } from "./create-object-form";

export default function NewCognitiveObjectPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-ink">New Cognitive Object</h1>
      <p className="mt-3 text-muted">
        Capture a meaningful unit of work so Donna can reason across context later.
      </p>

      <CreateObjectForm />
    </main>
  );
}
