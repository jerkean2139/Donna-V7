import type { Metadata } from "next";
import Link from "next/link";
import {
  ClerkProvider,
  OrganizationSwitcher,
  Show,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Donna V7 | Manumation Intelligence Layer",
  description: "The Intelligence Layer for Cognitive Objects, Cognitive Graph, governance, and better human-AI decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header className="border-b border-slate-200">
            <nav
              aria-label="Main navigation"
              className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4"
            >
              <div className="flex items-center gap-6">
                <Link href="/" className="font-semibold tracking-tight text-slate-950">
                  Donna V7
                </Link>
                <Show when="signed-in">
                  <Link href="/dashboard" className="text-sm text-slate-700 hover:text-slate-950">
                    Dashboard
                  </Link>
                  <Link href="/cognitive-objects" className="text-sm text-slate-700 hover:text-slate-950">
                    Cognitive Objects
                  </Link>
                </Show>
              </div>
              <div className="flex items-center gap-4">
                <Show
                  when="signed-in"
                  fallback={
                    <SignInButton>
                      <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white">
                        Sign in
                      </button>
                    </SignInButton>
                  }
                >
                  <OrganizationSwitcher />
                  <UserButton />
                </Show>
              </div>
            </nav>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
