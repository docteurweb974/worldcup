"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { MatchCard } from "./MatchCard";
import { IcsButton } from "./IcsButton";
import { filterByFavorites, type Match } from "@/lib/api";
import { dayKey, formatDateLong } from "@/lib/timezone";
import { calendarFilename } from "@/lib/ics";

type View = "mine" | "all";

function groupByDay(list: Match[], timezone: Parameters<typeof dayKey>[1]): Match[][] {
  const sorted = [...list].sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate));
  const map = new Map<string, Match[]>();
  for (const m of sorted) {
    const key = dayKey(m.utcDate, timezone);
    const bucket = map.get(key);
    if (bucket) bucket.push(m);
    else map.set(key, [m]);
  }
  return [...map.values()];
}

export function CalendarView({ matches }: { matches: Match[] }) {
  const { favorites, timezone, hydrated } = usePreferences();
  const [view, setView] = useState<View>("mine");

  const groups = useMemo(() => {
    const source = view === "all" ? matches : filterByFavorites(matches, favorites);
    return groupByDay(source, timezone);
  }, [matches, favorites, timezone, view]);

  const favoriteMatches = useMemo(
    () => filterByFavorites(matches, favorites),
    [matches, favorites],
  );

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Calendrier 📅</h1>
        {view === "mine" && favoriteMatches.length > 0 && (
          <IcsButton
            matches={favoriteMatches}
            filename={calendarFilename()}
            label="Exporter mes matchs"
          />
        )}
      </div>

      <div
        role="tablist"
        aria-label="Filtrer les matchs"
        className="inline-flex rounded-full bg-neutral-200 p-1 text-sm font-medium dark:bg-neutral-800"
      >
        {([
          ["mine", "Mes équipes"],
          ["all", "Tous les matchs"],
        ] as const).map(([v, label]) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`min-h-tap rounded-full px-4 transition-colors ${
              view === v
                ? "bg-white text-neutral-900 shadow dark:bg-neutral-950 dark:text-white"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "mine" && favorites.length === 0 ? (
        <Link
          href="/equipes"
          className="block rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700"
        >
          <p className="font-medium">Choisis tes équipes</p>
          <p className="mt-1 text-sm text-neutral-500">
            …ou bascule sur « Tous les matchs » pour pronostiquer librement.
          </p>
        </Link>
      ) : groups.length === 0 ? (
        <p className="p-6 text-center text-sm text-neutral-500">
          Aucun match à venir pour tes équipes. 🏁
        </p>
      ) : (
        <div className="space-y-6">
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
      )}
    </div>
  );
}
