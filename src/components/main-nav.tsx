"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cognitive-objects", label: "Cognitive Objects" },
  { href: "/decisions", label: "Decisions" },
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
                ? "text-sm font-semibold text-slate-950"
                : "text-sm text-slate-700 hover:text-slate-950"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
