"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { InlineMatchCard } from "./InlineMatchCard";
import { savePrediction } from "@/app/predictions/actions";
import { dayKey, formatDateLong, formatFull, type TimezoneChoice } from "@/lib/timezone";
import { displayTeam } from "@/data/teams";
import { isFinished, type Match } from "@/lib/api";
import { POINTS, predictionPoints, type ScorePrediction } from "@/lib/predictions";

export interface DbPrediction extends ScorePrediction {
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

export function PronosBoard({
  matches,
  initialPredictions,
}: {
  matches: Match[];
  initialPredictions: DbPrediction[];
}) {
  const { timezone } = usePreferences();
  const [preds, setPreds] = useState<Map<number, ScorePrediction>>(
    () => new Map(initialPredictions.map((p) => [p.matchId, { home: p.home, away: p.away }])),
  );
  const [onlyTodo, setOnlyTodo] = useState(false);

  const handleSave = async (matchId: number, score: ScorePrediction) => {
    const res = await savePrediction(matchId, score.home, score.away);
    if (!res?.error) setPreds((prev) => new Map(prev).set(matchId, score));
    return res;
  };

  const upcoming = useMemo(() => matches.filter(canPredict), [matches]);
  const done = upcoming.filter((m) => preds.has(m.id)).length;
  const pct = upcoming.length > 0 ? Math.round((100 * done) / upcoming.length) : 0;

  const upcomingGroups = useMemo(() => {
    const src = onlyTodo ? upcoming.filter((m) => !preds.has(m.id)) : upcoming;
    return groupByDay(src, timezone);
  }, [upcoming, onlyTodo, preds, timezone]);

  // Matchs terminés que tu as pronostiqués (ton bilan + points).
  const evaluated = useMemo(() => {
    return matches
      .filter((m) => isFinished(m.status) && preds.has(m.id))
      .map((m) => ({ m, pts: predictionPoints(preds.get(m.id)!, m) ?? 0 }))
      .sort((a, b) => +new Date(b.m.utcDate) - +new Date(a.m.utcDate));
  }, [matches, preds]);

  const total = evaluated.reduce((s, x) => s + x.pts, 0);
  const exact = evaluated.filter((x) => x.pts === POINTS.exact).length;
  const good = evaluated.filter((x) => x.pts === POINTS.outcome).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-xl font-bold">Mes pronos 🎯</h1>

      {evaluated.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
          <p className="text-sm text-neutral-500">Total de points</p>
          <p className="text-5xl font-bold text-accent">{total}</p>
          <div className="mt-3 flex justify-center gap-4 text-sm text-neutral-500">
            <span>🎯 {exact} exact{exact > 1 ? "s" : ""}</span>
            <span>✅ {good} bon{good > 1 ? "s" : ""}</span>
            <span>❌ {evaluated.length - exact - good} raté{evaluated.length - exact - good > 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">À pronostiquer</h2>
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
              {onlyTodo ? "Reste à faire" : "Tout afficher"}
            </button>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-neutral-500">
              <span>Progression</span>
              <span className="tabular-nums">{done} / {upcoming.length} matchs</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-cta transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {upcomingGroups.length === 0 ? (
            <p className="p-6 text-center text-sm text-neutral-500">Tout est pronostiqué. 🎉</p>
          ) : (
            upcomingGroups.map((dayMatches) => (
              <div key={dayMatches[0].id} className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-500">
                  {formatDateLong(dayMatches[0].utcDate, timezone)}
                </h3>
                {dayMatches.map((m) => (
                  <InlineMatchCard
                    key={m.id}
                    match={m}
                    prediction={preds.get(m.id) ?? null}
                    timezone={timezone}
                    onSave={handleSave}
                  />
                ))}
              </div>
            ))
          )}
        </section>
      )}

      {evaluated.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">Terminés</h2>
          {evaluated.map(({ m, pts }) => {
            const home = displayTeam(m.homeTeam.id, m.homeTeam.name);
            const away = displayTeam(m.awayTeam.id, m.awayTeam.name);
            const pred = preds.get(m.id)!;
            const tone =
              pts === POINTS.exact
                ? "text-green-600 dark:text-green-400"
                : pts === POINTS.outcome
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400";
            return (
              <Link
                key={m.id}
                href={`/match/${m.id}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800"
              >
                <div>
                  <p className="font-medium">
                    {home.flag} {home.nameFr} – {away.nameFr} {away.flag}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatFull(m.utcDate, timezone)} · Pari : {pred.home}-{pred.away}
                    {m.score.fullTime.home != null && (
                      <> · Résultat : {m.score.fullTime.home}-{m.score.fullTime.away}</>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 font-bold tabular-nums ${tone}`}>+{pts}</span>
              </Link>
            );
          })}
        </section>
      )}

      {evaluated.length === 0 && upcoming.length === 0 && (
        <p className="p-6 text-center text-sm text-neutral-500">Aucun match disponible.</p>
      )}
    </div>
  );
}
