"use client";

import { useState } from "react";
import { ScorePicker } from "./ScorePicker";
import { displayTeam } from "@/data/teams";
import { formatGroup, type Match } from "@/lib/api";
import { formatFull, type TimezoneChoice } from "@/lib/timezone";
import type { ScorePrediction } from "@/lib/predictions";

type SaveResult = { error?: string; ok?: boolean } | undefined;

/** Carte de match avec saisie du pronostic directement dans la liste. */
export function InlineMatchCard({
  match,
  prediction,
  timezone,
  onSave,
}: {
  match: Match;
  prediction: ScorePrediction | null;
  timezone: TimezoneChoice;
  onSave: (matchId: number, score: ScorePrediction) => Promise<SaveResult>;
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

  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
        <span className="capitalize">
          {match.group ? formatGroup(match.group) : match.stage.replaceAll("_", " ").toLowerCase()}
        </span>
        <span className="tabular-nums">{formatFull(match.utcDate, timezone)}</span>
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
        className="mt-2 min-h-tap w-full cursor-pointer rounded-xl bg-cta text-sm font-semibold text-cta-fg transition hover:brightness-110 disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : dirty ? "Enregistrer" : "✓ Enregistré"}
      </button>
    </div>
  );
}
