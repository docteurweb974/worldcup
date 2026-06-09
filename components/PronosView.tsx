"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { LeaderboardTeaser } from "./LeaderboardTeaser";
import { usePredictions } from "@/hooks/usePredictions";
import { formatFull } from "@/lib/timezone";
import { displayTeam } from "@/data/teams";
import { isFinished, type Match } from "@/lib/api";
import {
  POINTS,
  isValidPrediction,
  predictionPoints,
  type ScorePrediction,
} from "@/lib/predictions";

interface PronoItem {
  match: Match;
  pred: ScorePrediction;
  points: number | null;
}

export function PronosView({ matches }: { matches: Match[] }) {
  const { timezone } = usePreferences();
  const { predictions, hydrated } = usePredictions();

  const { evaluated, pending, total, exact, good } = useMemo(() => {
    const byId = new Map(matches.map((m) => [m.id, m]));
    const items: PronoItem[] = Object.entries(predictions)
      .filter(([, pred]) => isValidPrediction(pred))
      .map(([id, pred]) => {
        const match = byId.get(Number(id));
        return match ? { match, pred, points: predictionPoints(pred, match) } : null;
      })
      .filter((x): x is PronoItem => x !== null);

    const ev = items.filter((x) => isFinished(x.match.status) && x.points !== null);
    const pe = items.filter((x) => !isFinished(x.match.status));
    return {
      evaluated: ev,
      pending: pe,
      total: ev.reduce((s, x) => s + (x.points ?? 0), 0),
      exact: ev.filter((x) => x.points === POINTS.exact).length,
      good: ev.filter((x) => x.points === POINTS.outcome).length,
    };
  }, [matches, predictions]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    );
  }

  if (evaluated.length === 0 && pending.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Link
          href="/calendrier"
          className="block rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700"
        >
          <p className="font-medium">Aucun pronostic pour l&apos;instant 🎯</p>
          <p className="mt-1 text-sm text-neutral-500">
            Ouvrez un match à venir pour pronostiquer un score.
          </p>
        </Link>
        <LeaderboardTeaser />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6 p-4">
      <h1 className="text-xl font-bold">Mes pronos 🎯</h1>

      {evaluated.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
          <p className="text-sm text-neutral-500">Total de points</p>
          <p className="text-5xl font-bold text-accent">{total}</p>
          <div className="mt-3 flex justify-center gap-4 text-sm text-neutral-500">
            <span>🎯 {exact} exact{exact > 1 ? "s" : ""}</span>
            <span>✅ {good} bon{good > 1 ? "s" : ""} résultat{good > 1 ? "s" : ""}</span>
            <span>❌ {evaluated.length - exact - good} raté{evaluated.length - exact - good > 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {evaluated.length > 0 && (
        <PronoList title="Terminés" items={evaluated} timezone={timezone} showResult />
      )}
      {pending.length > 0 && <PronoList title="En attente" items={pending} timezone={timezone} />}

      <LeaderboardTeaser />
    </div>
  );
}

function PronoList({
  title,
  items,
  timezone,
  showResult,
}: {
  title: string;
  items: PronoItem[];
  timezone: ReturnType<typeof usePreferences>["timezone"];
  showResult?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-neutral-500">{title}</h2>
      {items.map(({ match, pred, points }) => {
        const home = displayTeam(match.homeTeam.id, match.homeTeam.name);
        const away = displayTeam(match.awayTeam.id, match.awayTeam.name);
        const tone =
          points === POINTS.exact
            ? "text-green-600 dark:text-green-400"
            : points === POINTS.outcome
              ? "text-amber-600 dark:text-amber-400"
              : "text-red-600 dark:text-red-400";
        return (
          <Link
            key={match.id}
            href={`/match/${match.id}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800"
          >
            <div>
              <p className="font-medium">
                {home.flag} {home.nameFr} – {away.nameFr} {away.flag}
              </p>
              <p className="text-xs text-neutral-500">
                {formatFull(match.utcDate, timezone)} · Pari : {pred.home} - {pred.away}
                {showResult && match.score.fullTime.home != null && (
                  <> · Résultat : {match.score.fullTime.home} - {match.score.fullTime.away}</>
                )}
              </p>
            </div>
            {showResult && (
              <span className={`shrink-0 font-bold tabular-nums ${tone}`}>+{points ?? 0}</span>
            )}
          </Link>
        );
      })}
    </section>
  );
}
