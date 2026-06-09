"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { MatchCard } from "./MatchCard";
import { InlineMatchCard } from "./InlineMatchCard";
import { IcsButton } from "./IcsButton";
import { savePrediction } from "@/app/predictions/actions";
import { filterByFavorites, type Match } from "@/lib/api";
import { dayKey, formatDateLong, type TimezoneChoice } from "@/lib/timezone";
import { calendarFilename } from "@/lib/ics";
import type { ScorePrediction } from "@/lib/predictions";

type View = "mine" | "all";
interface DbPrediction extends ScorePrediction {
  matchId: number;
}

const canPredict = (m: Match) => m.status === "SCHEDULED" || m.status === "TIMED";

function groupByDay(list: Match[], timezone: TimezoneChoice): Match[][] {
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

export function CalendarView({
  matches,
  isLoggedIn,
  initialPredictions,
}: {
  matches: Match[];
  isLoggedIn: boolean;
  initialPredictions: DbPrediction[];
}) {
  const { favorites, timezone, hydrated } = usePreferences();
  const [view, setView] = useState<View>("mine");
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [preds, setPreds] = useState<Map<number, ScorePrediction>>(
    () => new Map(initialPredictions.map((p) => [p.matchId, { home: p.home, away: p.away }])),
  );

  const handleSave = async (matchId: number, score: ScorePrediction) => {
    const res = await savePrediction(matchId, score.home, score.away);
    if (!res?.error) setPreds((prev) => new Map(prev).set(matchId, score));
    return res;
  };

  const favoriteMatches = useMemo(
    () => filterByFavorites(matches, favorites),
    [matches, favorites],
  );

  // Progression : matchs encore pronostiquables (pas commencés).
  const progress = useMemo(() => {
    const upcoming = matches.filter(canPredict);
    const done = upcoming.filter((m) => preds.has(m.id)).length;
    return { done, total: upcoming.length };
  }, [matches, preds]);

  const groups = useMemo(() => {
    let source = view === "all" ? matches : favoriteMatches;
    if (onlyTodo) source = source.filter((m) => canPredict(m) && !preds.has(m.id));
    return groupByDay(source, timezone);
  }, [matches, favoriteMatches, view, onlyTodo, preds, timezone]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    );
  }

  const pct = progress.total > 0 ? Math.round((100 * progress.done) / progress.total) : 0;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Calendrier 📅</h1>
        {view === "mine" && favoriteMatches.length > 0 && (
          <IcsButton matches={favoriteMatches} filename={calendarFilename()} label="Exporter mes matchs" />
        )}
      </div>

      {isLoggedIn && progress.total > 0 && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-neutral-500">
            <span>Pronostics</span>
            <span className="tabular-nums">
              {progress.done} / {progress.total} matchs
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-cta transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
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

        {isLoggedIn && (
          <button
            type="button"
            aria-pressed={onlyTodo}
            onClick={() => setOnlyTodo((v) => !v)}
            className={`min-h-tap rounded-full border px-4 text-sm font-medium transition-colors ${
              onlyTodo
                ? "border-cta bg-cta text-cta-fg"
                : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
            }`}
          >
            À pronostiquer
          </button>
        )}
      </div>

      {view === "mine" && favorites.length === 0 && !onlyTodo ? (
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
          {onlyTodo ? "Tout est pronostiqué ici. 🎉" : "Aucun match à afficher. 🏁"}
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((dayMatches) => (
            <section key={dayMatches[0].id} className="space-y-2">
              <h2 className="text-sm font-semibold text-neutral-500">
                {formatDateLong(dayMatches[0].utcDate, timezone)}
              </h2>
              {dayMatches.map((m) =>
                isLoggedIn && canPredict(m) ? (
                  <InlineMatchCard
                    key={m.id}
                    match={m}
                    prediction={preds.get(m.id) ?? null}
                    timezone={timezone}
                    onSave={handleSave}
                  />
                ) : (
                  <MatchCard key={m.id} match={m} />
                ),
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
