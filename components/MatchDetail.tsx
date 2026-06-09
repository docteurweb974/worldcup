"use client";

import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { ScorePicker } from "./ScorePicker";
import { IcsButton } from "./IcsButton";
import { usePredictions } from "@/hooks/usePredictions";
import { formatFull } from "@/lib/timezone";
import { calendarFilename } from "@/lib/ics";
import { displayTeam } from "@/data/teams";
import { formatGroup, isFinished, isLive, type Match } from "@/lib/api";
import { POINTS, predictionPoints, type ScorePrediction } from "@/lib/predictions";

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

  return (
    <div className="mx-auto max-w-xl animate-fade-in space-y-6 p-4">
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
          <div className="h-24 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ) : canPredict ? (
          <>
            <ScorePicker
              home={home}
              away={away}
              value={prediction}
              onChange={(score) => setPrediction(match.id, score)}
            />
            <p className="mt-3 text-center text-xs text-neutral-500">
              Score exact : {POINTS.exact} pts · bon résultat : {POINTS.outcome} pts.
            </p>
          </>
        ) : finished ? (
          <PredictionResult match={match} prediction={prediction} />
        ) : (
          <p className="text-sm text-neutral-500">
            Match en cours — pronostic clôturé.
            {prediction && ` Votre pari : ${prediction.home} - ${prediction.away}.`}
          </p>
        )}
      </section>

      <div className="text-center">
        <IcsButton
          matches={[match]}
          filename={calendarFilename(match)}
          label="Ajouter à mon calendrier"
        />
      </div>
    </div>
  );
}

/** Comparaison pronostic / résultat réel + points gagnés, après la fin du match. */
function PredictionResult({
  match,
  prediction,
}: {
  match: Match;
  prediction: ScorePrediction | undefined;
}) {
  if (!prediction) {
    return <p className="text-sm text-neutral-500">Vous n&apos;avez pas parié sur ce match.</p>;
  }
  const pts = predictionPoints(prediction, match) ?? 0;
  const tone =
    pts === POINTS.exact
      ? "text-green-600 dark:text-green-400"
      : pts === POINTS.outcome
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  const message =
    pts === POINTS.exact ? "Score exact !" : pts === POINTS.outcome ? "Bon résultat" : "Raté";

  return (
    <div className="space-y-1 text-sm">
      <p className={`text-lg font-bold ${tone}`}>
        +{pts} pt{pts > 1 ? "s" : ""} · {message}
      </p>
      <p className="text-neutral-500">
        Votre pronostic : {prediction.home} - {prediction.away}
      </p>
    </div>
  );
}
