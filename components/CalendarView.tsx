"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { MatchCard } from "./MatchCard";
import { filterByFavorites, type Match } from "@/lib/api";
import { dayKey, formatDateLong } from "@/lib/timezone";

export function CalendarView({ matches }: { matches: Match[] }) {
  const { favorites, timezone, hydrated } = usePreferences();

  // Filtrage par favoris + tri chronologique + regroupement par jour (selon le fuseau).
  const groups = useMemo(() => {
    const filtered = filterByFavorites(matches, favorites).sort(
      (a, b) => +new Date(a.utcDate) - +new Date(b.utcDate),
    );
    const map = new Map<string, Match[]>();
    for (const m of filtered) {
      const key = dayKey(m.utcDate, timezone);
      const bucket = map.get(key);
      if (bucket) bucket.push(m);
      else map.set(key, [m]);
    }
    return [...map.values()];
  }, [matches, favorites, timezone]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Link
          href="/equipes"
          className="block rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700"
        >
          <p className="font-medium">Choisis ton zékip ⭐</p>
          <p className="mt-1 text-sm text-neutral-500">
            Sélectionne tes équipes pour voir leurs matchs ici.
          </p>
        </Link>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="mx-auto max-w-md p-10 text-center text-sm text-neutral-500">
        Aucun match à venir pour tes équipes. 🏁
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-xl font-bold">Calendrier 📅</h1>
      {groups.map((dayMatches) => (
        <section key={dayMatches[0].id} className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-500">
            {formatDateLong(dayMatches[0].utcDate, timezone)}
          </h2>
          {dayMatches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </section>
      ))}
    </div>
  );
}
