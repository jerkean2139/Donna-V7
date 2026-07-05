import type { Metadata } from "next";
import { Chakra_Petch, DM_Mono, Syne } from "next/font/google";
import Link from "next/link";
import {
  ClerkProvider,
  OrganizationSwitcher,
  Show,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { MainNav } from "@/components/main-nav";
import "./globals.css";

// Self-hosted at build time (next/font) — no external font fetch at runtime.
// Exposed as CSS variables that globals.css maps onto the design tokens.
const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});
const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-syne",
  display: "swap",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Donna V7 | Manumation Intelligence Layer",
  description: "The Intelligence Layer for Cognitive Objects, Cognitive Graph, governance, and better human-AI decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${chakra.variable} ${syne.variable} ${dmMono.variable}`}>
      <body>
        <ClerkProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-cyan focus:px-4 focus:py-2 focus:font-semibold focus:text-bg-base"
          >
            Skip to content
          </a>
          <header className="border-b border-border-default bg-bg-surface-1">
            <nav
              aria-label="Main navigation"
              className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3.5"
            >
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className="font-display text-sm font-semibold uppercase tracking-widest text-text-secondary"
                >
                  Mission <span className="text-cyan">Control</span>
                </Link>
                <Show when="signed-in">
                  <MainNav />
                </Show>
              </div>
              <div className="flex items-center gap-4">
                <Show
                  when="signed-in"
                  fallback={
                    <SignInButton>
                      <button className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg-base">
                        Sign in
                      </button>
                    </SignInButton>
                  }
                >
                  <OrganizationSwitcher
                    appearance={{ elements: { rootBox: "text-text-secondary" } }}
                  />
                  <UserButton />
                </Show>
              </div>
            </nav>
          </header>
          <div id="main-content">{children}</div>
        </ClerkProvider>
      </body>
    </html>
  );
}
