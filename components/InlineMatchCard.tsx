"use client";

import { useState } from "react";
import Link from "next/link";
import { ScorePicker } from "./ScorePicker";
import { displayTeam } from "@/data/teams";
import { formatGroup, isFinished, type Match } from "@/lib/api";
import { formatFull, type TimezoneChoice } from "@/lib/timezone";
import { POINTS, predictionPoints, type ScorePrediction } from "@/lib/predictions";

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

  const [score, setScore] = useState<ScorePrediction>(prediction ?? { home: 0, away: 0 });
  const [savedScore, setSavedScore] = useState<ScorePrediction | null>(prediction);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    !savedScore || savedScore.home !== score.home || savedScore.away !== score.away;

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await onSave(match.id, score);
    setSaving(false);
    if (res?.error) setError(res.error);
    else setSavedScore({ ...score });
  };

  // Match terminé : carte verrouillée affichant le résultat + ton pari + points.
  if (isFinished(match.status)) {
    const ft = match.score.fullTime;
    const hasResult = ft.home != null && ft.away != null;
    const base = prediction && hasResult ? predictionPoints(prediction, match) ?? 0 : null;
    const pts = base != null && isBoost ? base * 2 : base;
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
          </span>
          <span className="tabular-nums">{formatFull(match.utcDate, timezone)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">
            {home.flag} {home.nameFr} <span className="tabular-nums">
              {hasResult ? `${ft.home} - ${ft.away}` : "—"}
            </span> {away.nameFr} {away.flag}
          </p>
          {pts != null && <span className={`shrink-0 font-bold tabular-nums ${tone}`}>+{pts}</span>}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {prediction ? `Ton pari : ${prediction.home}-${prediction.away}` : "Pas de prono"}
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
