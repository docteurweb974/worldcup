"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { TimezoneToggle } from "./TimezoneToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold"
        aria-label="World Cup Fun, accueil"
      >
        <span aria-hidden="true" className="text-xl">
          ⚽
        </span>
        <span className="hidden sm:inline">World Cup Fun</span>
      </Link>
      <div className="flex items-center gap-2">
        <TimezoneToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
