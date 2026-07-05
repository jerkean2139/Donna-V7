"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/cognitive-objects", label: "Cognitive Objects" },
  { href: "/decisions", label: "Decisions" },
  { href: "/integrations", label: "Integrations" },
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
                ? "text-sm font-semibold text-cyan"
                : "text-sm text-text-secondary transition-colors hover:text-text-primary"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
