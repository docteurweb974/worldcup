"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { TimezoneToggle } from "./TimezoneToggle";
import { AuthButton } from "./auth/AuthButton";
import type { AccountSummary } from "@/lib/account";

export function Header({ account }: { account: AccountSummary | null }) {
  return (
    <header className="sticky top-0 z-20 grid grid-cols-3 items-center gap-2 border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="flex items-center gap-2 justify-self-start">
        <ThemeToggle />
        <Link
          href="/"
          className="hidden font-display text-lg uppercase tracking-wide sm:inline"
          aria-label="World Cup Fun, accueil"
        >
          World Cup Fun
        </Link>
      </div>
      <div className="justify-self-center">
        <TimezoneToggle />
      </div>
      <div className="justify-self-end">
        <AuthButton account={account} />
      </div>
    </header>
  );
}
