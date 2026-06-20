"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateFavoriteTeam } from "@/app/profil/actions";
import { TEAMS } from "@/data/teams";

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Sélecteur compact d'équipe favorite, placé dans le coin du bandeau. */
export function HeroTeamSelector({ current }: { current: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentTeam = TEAMS.find((t) => t.tla === current);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return q ? TEAMS.filter((t) => normalize(t.nameFr).includes(q)) : TEAMS;
  }, [query]);

  const pick = async (tla: string | null) => {
    setSaving(true);
    await updateFavoriteTeam(tla);
    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <div ref={ref} className="absolute right-3 top-3 z-30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choisir mon équipe favorite"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25"
      >
        <span className="text-lg" aria-hidden="true">{currentTeam?.flag ?? "🏳️"}</span>
        <span className="max-w-[6rem] truncate">{currentTeam?.nameFr ?? "Mon équipe"}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-neutral-200 bg-white p-2 text-left text-neutral-900 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une équipe…"
            aria-label="Rechercher une équipe"
            className="mb-2 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
          />
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            <button
              type="button"
              onClick={() => pick(null)}
              disabled={saving}
              className={`flex w-full items-center justify-center rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                current === null ? "bg-accent-soft font-semibold" : ""
              }`}
            >
              Aucune
            </button>
            {filtered.map((t) => (
              <button
                key={t.tla}
                type="button"
                onClick={() => pick(t.tla)}
                disabled={saving}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  current === t.tla ? "bg-accent-soft font-semibold" : ""
                }`}
              >
                <span aria-hidden="true" className="text-lg">{t.flag}</span>
                <span className="flex-1 leading-tight">{t.nameFr}</span>
                {current === t.tla && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
