import { createCognitiveObjectAction } from "../actions";

const objectTypes = ["decision", "research", "meeting", "proposal", "issue", "lesson", "memory"];
const riskLevels = ["low", "medium", "high", "critical"];

export default function NewCognitiveObjectPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">New Cognitive Object</h1>
      <p className="mt-3 text-slate-700">
        Capture a meaningful unit of work so Donna can reason across context later.
      </p>

      <form action={createCognitiveObjectAction} className="mt-8 space-y-6">
        <label className="block">
          <span className="text-sm font-medium">Type</span>
          <select name="objectType" className="mt-2 w-full rounded-lg border border-slate-300 p-3">
            {objectTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input name="title" required className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Summary</span>
          <textarea name="summary" rows={3} className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Body</span>
          <textarea name="body" rows={8} className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Risk level</span>
          <select name="riskLevel" className="mt-2 w-full rounded-lg border border-slate-300 p-3">
            {riskLevels.map((risk) => (
              <option key={risk} value={risk}>{risk}</option>
            ))}
          </select>
        </label>

        <input type="hidden" name="source" value="manual" />

        <label className="block">
          <span className="text-sm font-medium">Tags, comma separated</span>
          <input name="tags" className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
        </label>

        <button type="submit" className="rounded-lg bg-slate-950 px-5 py-3 text-white">
          Create object
        </button>
      </form>
    </main>
  );
}
