"use client";

import { useMemo, useState } from "react";
import { usePreferences } from "./PreferencesProvider";
import { TEAMS } from "@/data/teams";

/** Normalise pour une recherche insensible aux accents et à la casse. */
const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function TeamSelector() {
  const { favorites, isFavorite, toggleFavorite, hydrated } = usePreferences();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return TEAMS;
    return TEAMS.filter((t) => normalize(t.nameFr).includes(q));
  }, [query]);

  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">Mes équipes ⭐</h1>
        <span className="text-sm text-neutral-500">
          {favorites.length} sélectionnée{favorites.length > 1 ? "s" : ""}
        </span>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une équipe…"
        aria-label="Rechercher une équipe"
        className="mb-4 min-h-tap w-full rounded-xl border border-neutral-300 bg-transparent px-4 dark:border-neutral-700"
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((team) => {
          const selected = isFavorite(team.tla);
          return (
            <button
              key={team.tla}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleFavorite(team.tla)}
              className={`flex min-h-tap items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                selected
                  ? "border-accent bg-accent-soft font-semibold text-accent"
                  : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800"
              }`}
            >
              <span aria-hidden="true" className="text-xl">
                {team.flag}
              </span>
              <span className="flex-1 leading-tight">{team.nameFr}</span>
              {selected && <span aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-neutral-500">Aucune équipe trouvée.</p>
      )}
    </div>
  );
}
