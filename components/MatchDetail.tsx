"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePreferences } from "./PreferencesProvider";
import { ScorePicker } from "./ScorePicker";
import { IcsButton } from "./IcsButton";
import { CommunityBar } from "./CommunityBar";
import type { CommunityStats } from "@/lib/community";
import { savePrediction } from "@/app/predictions/actions";
import { formatFull } from "@/lib/timezone";
import { calendarFilename } from "@/lib/ics";
import { displayTeam } from "@/data/teams";
import { formatGroup, isFinished, isLive, matchScore, scoreSuffix, type Match } from "@/lib/api";
import { POINTS, predictionPoints, qualifierBonus, type ScorePrediction } from "@/lib/predictions";
import { ResultHero, stageLabel } from "./ResultHero";

export function MatchDetail({
  match,
  prediction,
  isLoggedIn,
  community,
}: {
  match: Match;
  prediction: ScorePrediction | null;
  isLoggedIn: boolean;
  community: CommunityStats | null;
}) {
  const { timezone } = usePreferences();
  const router = useRouter();

  const home = displayTeam(match.homeTeam.id, match.homeTeam.name);
  const away = displayTeam(match.awayTeam.id, match.awayTeam.name);
  const live = isLive(match.status);
  const finished = isFinished(match.status);
  const canPredict = match.status === "SCHEDULED" || match.status === "TIMED";
  const ds = matchScore(match);
  const suffix = scoreSuffix(ds);
  const showScore = (live || finished) && ds.home != null && ds.away != null;

  const [score, setScore] = useState<ScorePrediction>(prediction ?? { home: 0, away: 0 });
  const [savedScore, setSavedScore] = useState<ScorePrediction | null>(prediction);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    !savedScore || savedScore.home !== score.home || savedScore.away !== score.away;

  // Résultat du pronostic (affiché dans la carte, pour un match terminé).
  const predResult =
    finished && prediction
      ? (() => {
          const base = predictionPoints(prediction, match) ?? 0;
          const bonus = qualifierBonus(prediction, match);
          return { home: prediction.home, away: prediction.away, base, points: base + bonus };
        })()
      : null;
  const reg = match.score.regularTime;

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const res = await savePrediction(match.id, score.home, score.away);
    setSaving(false);
    if (res?.error) setError(res.error);
    else {
      setSavedScore({ ...score });
      router.refresh(); // met à jour les points dans l'en-tête
    }
  };

  return (
    <div className="animate-fade-in">
      {finished && ds.home != null && ds.away != null && (
        <ResultHero
          stadium="/stadium-1.jpg"
          home={{ flag: home.flag, nameFr: home.nameFr, tla: match.homeTeam.tla }}
          away={{ flag: away.flag, nameFr: away.nameFr, tla: match.awayTeam.tla }}
          score={{ home: ds.home, away: ds.away }}
          pens={ds.penalties}
          aet={ds.aet}
          reg={reg?.home != null ? { home: reg.home, away: reg.away ?? 0 } : null}
          stage={stageLabel(match.stage, match.group)}
          date={formatFull(match.utcDate, timezone)}
          prediction={predResult}
        />
      )}

      <div className="mx-auto max-w-xl space-y-6 p-4">
        {!finished && (
          <>
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
              <>
                <span className="text-3xl font-bold tabular-nums">
                  {ds.home} <span className="text-neutral-400">-</span> {ds.away}
                </span>
                {suffix && (
                  <p className="text-xs font-medium uppercase text-neutral-400">{suffix}</p>
                )}
                {(ds.aet || ds.penalties) && match.score.regularTime?.home != null && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="13" r="8" />
                      <path d="M12 13V9" />
                      <path d="M9 2h6" />
                    </svg>
                    90 min : {match.score.regularTime.home}-{match.score.regularTime.away}
                  </span>
                )}
              </>
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
          </>
        )}

      {!finished && (
      <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 font-bold">Mon pronostic 🎯</h2>

        {canPredict && !isLoggedIn ? (
          <Link
            href="/connexion"
            className="block rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm dark:border-neutral-700"
          >
            <span className="font-medium">Connecte-toi pour pronostiquer</span>
            <span className="mt-1 block text-neutral-500">
              Ton score comptera au classement.
            </span>
          </Link>
        ) : canPredict ? (
          <div className="space-y-3">
            <ScorePicker home={home} away={away} value={score} onChange={setScore} />
            {error && (
              <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !isDirty}
              className="min-h-tap w-full cursor-pointer rounded-xl bg-cta font-semibold text-cta-fg transition hover:brightness-110 disabled:opacity-50"
            >
              {saving
                ? "Enregistrement…"
                : isDirty
                  ? "Enregistrer mon pronostic"
                  : "✓ Pronostic enregistré"}
            </button>
            <p className="text-center text-xs text-neutral-500">
              Score exact : {POINTS.exact} pts · bon résultat : {POINTS.outcome} pts.
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Match en cours — pronostic clôturé.
            {savedScore && ` Ton pari : ${savedScore.home} - ${savedScore.away}.`}
          </p>
        )}
      </section>
      )}

      {community && community.total > 0 && (
        <CommunityBar
          stats={community}
          homeName={home.nameFr}
          awayName={away.nameFr}
          homeFlag={home.flag}
          awayFlag={away.flag}
        />
      )}

      {!isFinished(match.status) && (
        <div className="text-center">
          <IcsButton
            matches={[match]}
            filename={calendarFilename(match)}
            label="Ajouter à mon calendrier"
          />
        </div>
      )}
      </div>
    </div>
  );
}
