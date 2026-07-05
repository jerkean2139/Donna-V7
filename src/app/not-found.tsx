import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Page not found</h1>
      <p className="mt-3 text-text-secondary">
        This page does not exist, or the Cognitive Object it refers to is not part of your
        active workspace.
      </p>
      <Link href="/cognitive-objects" className="mt-6 inline-block rounded-lg bg-cyan px-5 py-3 text-sm text-bg-base">
        Back to Cognitive Objects
      </Link>
    </main>
  );
}
