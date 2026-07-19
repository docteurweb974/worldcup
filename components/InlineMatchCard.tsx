"use client";

import { useState } from "react";
import Link from "next/link";
import { ScorePicker } from "./ScorePicker";
import { displayTeam } from "@/data/teams";
import { formatGroup, isFinished, matchScore, scoreSuffix, type Match } from "@/lib/api";
import { formatFull, type TimezoneChoice } from "@/lib/timezone";
import {
  POINTS,
  predictionPoints,
  qualifierBonus,
  hasQualifierOption,
  pointsMultiplier,
  type ScorePrediction,
  type Qualifier,
} from "@/lib/predictions";

type SaveResult = { error?: string; ok?: boolean } | undefined;

/** Carte de match avec saisie du pronostic directement dans la liste. */
export function InlineMatchCard({
  match,
  prediction,
  timezone,
  onSave,
  isBoost = false,
  roundHasBoost = false,
  onToggleBoost,
}: {
  match: Match;
  prediction: ScorePrediction | null;
  timezone: TimezoneChoice;
  onSave: (matchId: number, score: ScorePrediction) => Promise<SaveResult>;
  isBoost?: boolean;
  roundHasBoost?: boolean; // un boost est déjà posé sur cette journée
  onToggleBoost?: () => void;
}) {
  const home = displayTeam(match.homeTeam.id, match.homeTeam.name);
  const away = displayTeam(match.awayTeam.id, match.awayTeam.name);

  const [score, setScore] = useState<ScorePrediction>(
    prediction ? { home: prediction.home, away: prediction.away } : { home: 0, away: 0 },
  );
  const [qualifier, setQualifier] = useState<Qualifier | null>(prediction?.qualifier ?? null);
  const [savedScore, setSavedScore] = useState<ScorePrediction | null>(prediction);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tie-break « qualifié » : proposé sur un nul, en phase finale (8es+).
  const showQualifier = hasQualifierOption(match.stage) && score.home === score.away;
  const effQualifier = showQualifier ? qualifier : null;

  const dirty =
    !savedScore ||
    savedScore.home !== score.home ||
    savedScore.away !== score.away ||
    (savedScore.qualifier ?? null) !== effQualifier;

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload: ScorePrediction = { home: score.home, away: score.away, qualifier: effQualifier };
    const res = await onSave(match.id, payload);
    setSaving(false);
    if (res?.error) setError(res.error);
    else setSavedScore(payload);
  };

  // Match terminé : carte verrouillée affichant le résultat + ton pari + points.
  if (isFinished(match.status)) {
    const ds = matchScore(match);
    const suffix = scoreSuffix(ds);
    const hasResult = ds.home != null && ds.away != null;
    const base = prediction && hasResult ? predictionPoints(prediction, match) ?? 0 : null;
    const bonus = prediction ? qualifierBonus(prediction, match) : 0;
    const pts = base != null ? ((isBoost ? base * 2 : base) + bonus) * pointsMultiplier(match.stage) : null;
    const tone =
      base === POINTS.exact
        ? "text-green-600 dark:text-green-400"
        : base === POINTS.outcome
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";
    return (
      <Link
        href={`/match/${match.id}`}
        className={`block rounded-xl border p-3 ${
          isBoost ? "border-emerald-500 ring-1 ring-emerald-500" : "border-neutral-200 dark:border-neutral-800"
        }`}
      >
        <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
          <span className="capitalize">
            {match.group ? formatGroup(match.group) : match.stage.replaceAll("_", " ").toLowerCase()}
            {isBoost && <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">· ⚡ Boost</span>}
            {match.stage === "FINAL" && <span className="ml-1 font-semibold text-violet-600 dark:text-violet-400">· 🏆 ×2</span>}
          </span>
          <span className="tabular-nums">{formatFull(match.utcDate, timezone)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">
            {home.flag} {home.nameFr}{" "}
            <span className="tabular-nums">{hasResult ? `${ds.home} - ${ds.away}` : "—"}</span>{" "}
            {away.nameFr} {away.flag}
            {suffix && (
              <span className="ml-1 text-[10px] font-medium uppercase text-neutral-400">
                {suffix}
              </span>
            )}
          </p>
          {pts != null && <span className={`shrink-0 font-bold tabular-nums ${tone}`}>+{pts}</span>}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {prediction ? `Ton pari : ${prediction.home}-${prediction.away}` : "Pas de prono"}
          {prediction?.qualifier && hasQualifierOption(match.stage) && (
            <>
              {" "}· Qualifié :{" "}
              {prediction.qualifier === "home"
                ? `${home.flag} ${home.nameFr}`
                : `${away.flag} ${away.nameFr}`}
              {bonus > 0 && (
                <span className="font-semibold text-amber-600 dark:text-amber-400"> ✓ +2</span>
              )}
            </>
          )}
        </p>
      </Link>
    );
  }

  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        isBoost
          ? "border-emerald-500 ring-1 ring-emerald-500"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="capitalize">
            {match.group ? formatGroup(match.group) : match.stage.replaceAll("_", " ").toLowerCase()}
          </span>
          {match.stage !== "GROUP_STAGE" && (
            <span
              title="Points comptés sur le score à 90 min (hors prolongation et tirs au but)"
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold normal-case text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 13V9" />
                <path d="M9 2h6" />
              </svg>
              90 min
            </span>
          )}
          {match.stage === "FINAL" && (
            <span
              title="La finale compte double : tous tes points sur ce match sont multipliés par 2"
              className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold normal-case text-violet-700 dark:bg-violet-400/15 dark:text-violet-300"
            >
              🏆 Finale ×2
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {onToggleBoost && isBoost && (
            <button
              type="button"
              aria-pressed
              onClick={onToggleBoost}
              title="Boost actif sur ce match — clique pour le retirer"
              className="rounded-full border border-emerald-500 bg-emerald-500 px-2.5 py-0.5 font-bold text-white transition active:scale-95"
            >
              ⚡ Boost activé ✓
            </button>
          )}
          {onToggleBoost && !isBoost && roundHasBoost && (
            <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 font-semibold text-neutral-400 dark:border-neutral-700">
              Boost déjà utilisé
            </span>
          )}
          {onToggleBoost && !isBoost && !roundHasBoost && (
            <button
              type="button"
              aria-pressed={false}
              onClick={onToggleBoost}
              title="Double les points de ce match (1 Boost par journée de poules)"
              className="rounded-full border border-amber-400 bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800 transition hover:bg-amber-200 active:scale-95 dark:bg-amber-400/15 dark:text-amber-300"
            >
              ⚡ Boost ×2
            </button>
          )}
          <span className="tabular-nums">{formatFull(match.utcDate, timezone)}</span>
        </div>
      </div>

      <ScorePicker home={home} away={away} value={score} onChange={setScore} />

      {showQualifier && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-400/20 dark:bg-amber-400/10">
          <p className="mb-2 text-center text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Match nul à 90’ → qui se qualifie ?{" "}
            <span className="font-semibold text-amber-700 dark:text-amber-400">+2 pts</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["home", "away"] as const).map((side) => {
              const team = side === "home" ? home : away;
              const sel = qualifier === side;
              return (
                <button
                  key={side}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => setQualifier(sel ? null : side)}
                  className={`min-h-tap rounded-lg border px-2 text-sm font-medium transition active:scale-[0.98] ${
                    sel
                      ? "border-amber-400 bg-amber-100 font-semibold text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/20 dark:text-amber-200"
                      : "border-neutral-300 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  }`}
                >
                  {team.flag} {team.nameFr}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty}
        className="mt-2 min-h-tap w-full cursor-pointer rounded-xl bg-cta text-sm font-semibold text-cta-fg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : dirty ? "Enregistrer" : "✓ Enregistré"}
      </button>
    </div>
  );
}
