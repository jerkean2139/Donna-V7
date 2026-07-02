import Link from "next/link";
import { createDecisionAction } from "../actions";

const riskLevels = ["low", "medium", "high", "critical"];

export default function NewDecisionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link className="text-sm text-slate-500 hover:text-slate-900" href="/decisions">
        ← All decisions
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">New Decision</h1>
      <p className="mt-3 text-slate-700">
        Capture the decision and what it is trying to accomplish. Run the Evolution Loop afterward
        to build out assumptions, options, and a recommendation.
      </p>

      <form action={createDecisionAction} className="mt-8 space-y-6">
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            name="title"
            required
            placeholder="Choose MVP deployment architecture"
            className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Objective</span>
          <span className="ml-2 text-xs text-slate-500">What are you trying to accomplish?</span>
          <textarea
            name="objective"
            required
            rows={3}
            placeholder="Decide how to deploy the Manumation Intelligence Layer MVP."
            className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Summary</span>
          <textarea name="summary" rows={3} className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Risk level</span>
          <select name="riskLevel" className="mt-2 w-full rounded-lg border border-slate-300 p-3">
            {riskLevels.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Tags, comma separated</span>
          <input name="tags" className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
        </label>

        <button type="submit" className="rounded-lg bg-slate-950 px-5 py-3 text-white">
          Create decision
        </button>
      </form>
    </main>
  );
}
