"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { TimezoneToggle } from "./TimezoneToggle";
import { AuthButton } from "./auth/AuthButton";
import type { AccountSummary } from "@/lib/account";

export function Header({ account }: { account: AccountSummary | null }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="flex min-w-0 items-center gap-2">
        <ThemeToggle />
        <TimezoneToggle />
        <Link
          href="/"
          className="hidden font-display text-lg uppercase tracking-wide lg:inline"
          aria-label="World Cup Fun, accueil"
        >
          World Cup Fun
        </Link>
      </div>
      <AuthButton account={account} />
    </header>
  );
}
