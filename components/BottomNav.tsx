"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "./nav-items";
import { NavIcon } from "./NavIcon";

/** Barre d'onglets fixée en bas, visible sur mobile uniquement (md:hidden). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-tap flex-col items-center justify-center gap-0.5 py-2 text-[0.65rem] transition-colors ${
              active
                ? "text-accent"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            <NavIcon name={item.icon} className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
