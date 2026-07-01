"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cognitive-objects", label: "Objects" },
  { href: "/decisions", label: "Decisions" },
];

export function SiteHeader() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-sm font-bold tracking-tight text-slate-950">
          Donna V7
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {isSignedIn &&
            navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
        </nav>

        <div className="flex items-center gap-2">
          {isLoaded && !isSignedIn && (
            <>
              <SignInButton mode="modal">
                <button className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-md bg-slate-950 px-3 py-1.5 text-sm text-white">
                  Sign up
                </button>
              </SignUpButton>
            </>
          )}
          {isSignedIn && <UserButton />}
        </div>
      </div>
    </header>
  );
}
