"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface Tab {
  href: string;
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
}

const tabs: Tab[] = [
  {
    href: "/console",
    label: "Donna",
    match: (p) => p === "/console" || p.startsWith("/console/"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.7 8.7 0 0 1-3.9-.9L3 21l1.4-4.6A8.7 8.7 0 0 1 3.5 11 8.38 8.38 0 0 1 12 2.5a8.38 8.38 0 0 1 9 9Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Home",
    match: (p) => p === "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/cognitive-objects",
    label: "Objects",
    match: (p) => p === "/cognitive-objects" || (p.startsWith("/cognitive-objects/") && !p.endsWith("/new")),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
        <path d="M3.5 9h17M9 20.5V9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/cognitive-objects/new",
    label: "New",
    match: (p) => p.endsWith("/new"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/decisions",
    label: "Decisions",
    match: (p) => p === "/decisions" || p.startsWith("/decisions/"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// Fixed bottom tab bar for mobile only (hidden at sm+, where the top nav
// serves). The RootLayout adds matching bottom padding so content never sits
// under the bar, and the bar respects the iOS home-indicator safe area.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-canvas/90 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-ink" : "text-faint"
                }`}
              >
                <span className={`h-6 w-6 ${active ? "text-accent" : ""}`}>{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
