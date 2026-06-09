"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { usePredictions } from "@/hooks/usePredictions";
import { formatFull } from "@/lib/timezone";
import { displayTeam } from "@/data/teams";
import { isFinished, outcomeFromWinner, type Match, type Outcome } from "@/lib/api";

interface PronoItem {
  match: Match;
  choice: Outcome;
}

export function PronosView({ matches }: { matches: Match[] }) {
  const { timezone } = usePreferences();
  const { predictions, hydrated } = usePredictions();

  const { evaluated, pending, correct } = useMemo(() => {
    const byId = new Map(matches.map((m) => [m.id, m]));
    const items: PronoItem[] = Object.entries(predictions)
      .map(([id, choice]) => ({ match: byId.get(Number(id)), choice }))
      .filter((x): x is PronoItem => x.match !== undefined);
    const ev = items.filter((x) => isFinished(x.match.status));
    const pe = items.filter((x) => !isFinished(x.match.status));
    const ok = ev.filter((x) => x.choice === outcomeFromWinner(x.match.score.winner)).length;
    return { evaluated: ev, pending: pe, correct: ok };
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
      <div className="mx-auto max-w-md p-6">
        <Link
          href="/calendrier"
          className="block rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700"
        >
          <p className="font-medium">Aucun pronostic pour l&apos;instant 🎯</p>
          <p className="mt-1 text-sm text-neutral-500">
            Ouvrez un match à venir pour faire votre premier pronostic.
          </p>
        </Link>
      </div>
    );
  }

  const rate = evaluated.length > 0 ? Math.round((100 * correct) / evaluated.length) : 0;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6 p-4">
      <h1 className="text-xl font-bold">Mes pronos 🎯</h1>

      {evaluated.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
          <p className="text-sm text-neutral-500">Taux de réussite</p>
          <p className="text-4xl font-bold text-accent">{rate}%</p>
          <p className="mt-1 text-sm text-neutral-500">
            {correct} / {evaluated.length} pronostic{evaluated.length > 1 ? "s" : ""} réussi
            {correct > 1 ? "s" : ""}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-accent" style={{ width: `${rate}%` }} />
          </div>
        </div>
      )}

      {evaluated.length > 0 && (
        <PronoList title="Terminés" items={evaluated} timezone={timezone} showResult />
      )}
      {pending.length > 0 && (
        <PronoList title="En attente" items={pending} timezone={timezone} />
      )}
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
      {items.map(({ match, choice }) => {
        const home = displayTeam(match.homeTeam.id, match.homeTeam.name);
        const away = displayTeam(match.awayTeam.id, match.awayTeam.name);
        const actual = outcomeFromWinner(match.score.winner);
        const correct = showResult && actual != null && choice === actual;
        const choiceLabel =
          choice === "home" ? home.nameFr : choice === "away" ? away.nameFr : "Nul";
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
                {formatFull(match.utcDate, timezone)} · Pari : {choiceLabel}
              </p>
            </div>
            {showResult && (
              <span
                className={`shrink-0 font-semibold ${
                  correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {correct ? "✓" : "✗"}
              </span>
            )}
          </Link>
        );
      })}
    </section>
  );
}
