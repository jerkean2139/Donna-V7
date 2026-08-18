"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/console", label: "Console" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cognitive-objects", label: "Cognitive Objects" },
  { href: "/decisions", label: "Decisions" },
  { href: "/guide", label: "Guide" },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "text-sm font-semibold text-ink"
                : "text-sm text-muted transition-colors hover:text-ink"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
