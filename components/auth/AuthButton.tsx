"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import type { AccountSummary } from "@/lib/account";

/** Compte connecté : pseudo + points + menu déroulant (profil, pronos, déconnexion). */
export function AuthButton({ account }: { account: AccountSummary | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!account) {
    return (
      <Link
        href="/connexion"
        className="grid min-h-tap place-items-center rounded-full bg-accent px-4 text-sm font-semibold text-white"
      >
        Connexion
      </Link>
    );
  }

  const itemCls =
    "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full px-1 py-1 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <span className="text-right leading-tight">
          <span className="block max-w-[8rem] truncate text-sm font-semibold sm:max-w-[14rem]">
            {account.username}
          </span>
          <span className="block text-xs font-semibold text-accent">{account.points} pts</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        >
          <Link
            role="menuitem"
            href={`/joueur/${account.id}`}
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            Mon profil
          </Link>
          <Link role="menuitem" href="/pronos" onClick={() => setOpen(false)} className={itemCls}>
            Mes pronos
          </Link>
          <Link role="menuitem" href="/resumes" onClick={() => setOpen(false)} className={itemCls}>
            Résumés 🎬
          </Link>
          <Link role="menuitem" href="/survivor" onClick={() => setOpen(false)} className={itemCls}>
            Mode Survivor 💀
          </Link>
          <Link role="menuitem" href="/champion" onClick={() => setOpen(false)} className={itemCls}>
            Prédiction 🔮
          </Link>
          <form action={logout}>
            <button
              role="menuitem"
              type="submit"
              className={`${itemCls} cursor-pointer text-red-600 dark:text-red-400`}
            >
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
