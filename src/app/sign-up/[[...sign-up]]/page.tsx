import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Sign up | Donna V7",
};

// Catch-all route so Clerk's <SignUp /> handles its own sub-paths in-app
// instead of redirecting to the hosted Account Portal. ClerkProvider (layout)
// points signUpUrl here.
export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-12">
      <h1 className="mb-6 font-display text-2xl font-semibold uppercase tracking-widest text-text-secondary">
        Mission <span className="text-cyan">Control</span>
      </h1>
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#22d3ee",
            borderRadius: "0.6rem",
          },
        }}
      />
    </main>
  );
}
