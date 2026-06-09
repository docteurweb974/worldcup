"use client";

import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { PredictionButtons } from "./PredictionButtons";
import { usePredictions } from "@/hooks/usePredictions";
import { formatFull } from "@/lib/timezone";
import { displayTeam } from "@/data/teams";
import {
  formatGroup,
  isFinished,
  isLive,
  outcomeFromWinner,
  type Match,
  type Outcome,
} from "@/lib/api";

export function MatchDetail({ match }: { match: Match }) {
  const { timezone } = usePreferences();
  const { getPrediction, setPrediction, hydrated } = usePredictions();

  const home = displayTeam(match.homeTeam.id, match.homeTeam.name);
  const away = displayTeam(match.awayTeam.id, match.awayTeam.name);
  const live = isLive(match.status);
  const finished = isFinished(match.status);
  const canPredict = match.status === "SCHEDULED" || match.status === "TIMED";
  const { home: hScore, away: aScore } = match.score.fullTime;
  const showScore = (live || finished) && hScore != null && aScore != null;

  const prediction = getPrediction(match.id);
  const label = (o: Outcome) =>
    o === "home" ? `Victoire ${home.nameFr}` : o === "away" ? `Victoire ${away.nameFr}` : "Match nul";

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <Link href="/calendrier" className="text-sm text-neutral-500 hover:text-accent">
        ← Calendrier
      </Link>

      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {match.group ? formatGroup(match.group) : match.stage.replaceAll("_", " ")}
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-4xl" aria-hidden="true">{home.flag}</span>
            <span className="text-sm font-semibold">{home.nameFr}</span>
          </div>
          <div className="text-center">
            {showScore ? (
              <span className="text-3xl font-bold tabular-nums">
                {hScore} <span className="text-neutral-400">-</span> {aScore}
              </span>
            ) : (
              <span className="text-neutral-400">vs</span>
            )}
            {live && (
              <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">DIRECT</p>
            )}
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-4xl" aria-hidden="true">{away.flag}</span>
            <span className="text-sm font-semibold">{away.nameFr}</span>
          </div>
        </div>
        <p className="text-sm text-neutral-500">{formatFull(match.utcDate, timezone)}</p>
      </header>

      <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 font-bold">Mon pronostic 🎯</h2>

        {!hydrated ? (
          <div className="h-12 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ) : canPredict ? (
          <PredictionButtons
            homeName={home.nameFr}
            awayName={away.nameFr}
            value={prediction}
            onChange={(choice) => setPrediction(match.id, choice)}
          />
        ) : finished ? (
          <PredictionResult prediction={prediction} actual={outcomeFromWinner(match.score.winner)} label={label} />
        ) : (
          <p className="text-sm text-neutral-500">
            Match en cours — pronostic clôturé.
            {prediction && ` Votre pari : ${label(prediction)}.`}
          </p>
        )}
      </section>
    </div>
  );
}

/** Comparaison pronostic / résultat réel après la fin du match. */
function PredictionResult({
  prediction,
  actual,
  label,
}: {
  prediction: Outcome | undefined;
  actual: Outcome | null;
  label: (o: Outcome) => string;
}) {
  if (!prediction) {
    return <p className="text-sm text-neutral-500">Vous n&apos;avez pas parié sur ce match.</p>;
  }
  const correct = actual != null && prediction === actual;
  return (
    <div className="space-y-1 text-sm">
      <p
        className={`font-semibold ${
          correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        }`}
      >
        {correct ? "✓ Pronostic réussi" : "✗ Pronostic raté"}
      </p>
      <p className="text-neutral-500">Votre pari : {label(prediction)}</p>
      {actual && <p className="text-neutral-500">Résultat : {label(actual)}</p>}
    </div>
  );
}
