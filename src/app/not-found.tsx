import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-slate-950">Page not found</h1>
      <p className="mt-3 text-slate-700">
        This page does not exist, or the Cognitive Object it refers to is not part of your
        active workspace.
      </p>
      <Link href="/cognitive-objects" className="mt-6 inline-block rounded-lg bg-slate-950 px-5 py-3 text-sm text-white">
        Back to Cognitive Objects
      </Link>
    </main>
  );
}
