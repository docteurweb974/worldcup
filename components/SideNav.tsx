"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "./nav-items";

/** Barre latérale, visible sur desktop uniquement (hidden md:flex). */
export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 border-r border-neutral-200 p-4 dark:border-neutral-800 md:flex">
      <Link href="/" className="mb-4 flex items-center gap-2 px-3 text-lg font-bold">
        <span aria-hidden="true">⚽</span> World Cup Fun
      </Link>
      <nav aria-label="Navigation principale" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-tap items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
              }`}
            >
              <span aria-hidden="true" className="text-lg">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
