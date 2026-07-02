import Link from "next/link";
import { CreateDecisionForm } from "./create-decision-form";

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

      <CreateDecisionForm />
    </main>
  );
}
