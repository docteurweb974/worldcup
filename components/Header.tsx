"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { TimezoneToggle } from "./TimezoneToggle";
import { AuthButton } from "./auth/AuthButton";

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          href="/"
          className="hidden font-display text-lg uppercase tracking-wide sm:inline"
          aria-label="World Cup Fun, accueil"
        >
          World Cup Fun
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <TimezoneToggle />
        <AuthButton />
      </div>
    </header>
  );
}
