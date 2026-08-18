import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Sign in | Donna V7",
};

// Catch-all route so Clerk's <SignIn /> handles its own sub-paths (factor-one,
// SSO callbacks, etc.) in-app instead of redirecting to the hosted Account
// Portal. ClerkProvider (layout) points signInUrl here.
export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-12">
      <h1 className="mb-6 font-display text-2xl font-semibold uppercase tracking-widest text-text-secondary">
        Mission <span className="text-cyan">Control</span>
      </h1>
      <SignIn
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
