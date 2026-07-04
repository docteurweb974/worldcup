"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { MatchCard } from "./MatchCard";
import { IcsButton } from "./IcsButton";
import { filterByFavorites, type Match } from "@/lib/api";
import { dayKey, dayChip, todayKey, formatDateLong, type TimezoneChoice } from "@/lib/timezone";
import { calendarFilename } from "@/lib/ics";

type View = "mine" | "all";

interface Day {
  key: string;
  iso: string; // 1er match du jour (pour le formatage)
  matches: Match[];
}

function groupByDay(list: Match[], timezone: TimezoneChoice): Day[] {
  const sorted = [...list].sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate));
  const map = new Map<string, Day>();
  for (const m of sorted) {
    const key = dayKey(m.utcDate, timezone);
    const d = map.get(key);
    if (d) d.matches.push(m);
    else map.set(key, { key, iso: m.utcDate, matches: [m] });
  }
  return [...map.values()];
}

export function CalendarView({
  matches,
  predictedMatchIds = [],
}: {
  matches: Match[];
  predictedMatchIds?: number[];
}) {
  const { favorites, timezone, hydrated } = usePreferences();
  const [view, setView] = useState<View>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const predicted = useMemo(() => new Set(predictedMatchIds), [predictedMatchIds]);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const favoriteMatches = useMemo(
    () => filterByFavorites(matches, favorites),
    [matches, favorites],
  );
  const days = useMemo(
    () => groupByDay(view === "all" ? matches : favoriteMatches, timezone),
    [matches, favoriteMatches, view, timezone],
  );

  // Jour par défaut : aujourd'hui s'il a des matchs, sinon le prochain jour, sinon le dernier.
  const defaultKey = useMemo(() => {
    if (days.length === 0) return null;
    const tKey = todayKey(timezone);
    if (days.some((d) => d.key === tKey)) return tKey;
    const upcoming = days.find((d) => d.key >= tKey);
    return (upcoming ?? days[days.length - 1]).key;
  }, [days, timezone]);

  // (Ré)initialise la sélection si le jour courant n'existe plus (changement de filtre).
  useEffect(() => {
    if (!selected || !days.some((d) => d.key === selected)) setSelected(defaultKey);
  }, [days, defaultKey, selected]);

  // Centre la puce sélectionnée dans la barre (défilement fluide).
  useEffect(() => {
    if (selected)
      chipRefs.current[selected]?.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth",
      });
  }, [selected]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    );
  }

  const tKey = todayKey(timezone);
  const currentDay = days.find((d) => d.key === selected) ?? null;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Calendrier 📅</h1>
        {view === "mine" && favoriteMatches.length > 0 && (
          <IcsButton matches={favoriteMatches} filename={calendarFilename()} label="Exporter mes matchs" />
        )}
      </div>

      {/* Toggle Mes équipes / Tous les matchs (centré) */}
      <div className="flex justify-center">
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
              onClick={() => {
                setView(v);
                setSelected(null); // revient au jour courant pour le nouveau filtre
              }}
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
      </div>

      {view === "mine" && favorites.length === 0 ? (
        <Link
          href="/equipes"
          className="block rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700"
        >
          <p className="font-medium">Choisis tes équipes</p>
          <p className="mt-1 text-sm text-neutral-500">
            …ou bascule sur « Tous les matchs » pour tout voir.
          </p>
        </Link>
      ) : days.length === 0 ? (
        <p className="p-6 text-center text-sm text-neutral-500">Aucun match à afficher. 🏁</p>
      ) : (
        <>
          {/* Barre de dates horizontale (centrée si peu de jours, sinon défilante) */}
          <div className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto pb-1">
            {days.map((d) => {
              const chip = dayChip(d.iso, timezone);
              const isSel = d.key === selected;
              const isToday = d.key === tKey;
              return (
                <button
                  key={d.key}
                  ref={(el) => {
                    chipRefs.current[d.key] = el;
                  }}
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => setSelected(d.key)}
                  className={`flex min-h-tap shrink-0 flex-col items-center justify-center rounded-xl px-3 py-1.5 transition-colors ${
                    isSel
                      ? "bg-accent text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  }`}
                >
                  <span className="text-xs capitalize">{isToday ? "Auj." : chip.weekday}</span>
                  <span className="text-lg font-bold leading-none">{chip.day}</span>
                </button>
              );
            })}
          </div>

          {/* Matchs du jour sélectionné (fondu à chaque changement de jour) */}
          {currentDay && (
            <section key={currentDay.key} className="animate-fade-in space-y-2">
              <h2 className="text-sm font-semibold text-neutral-500">
                {formatDateLong(currentDay.iso, timezone)} · {currentDay.matches.length} match
                {currentDay.matches.length > 1 ? "s" : ""}
              </h2>
              {currentDay.matches.map((m) => (
                <MatchCard key={m.id} match={m} predicted={predicted.has(m.id)} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
