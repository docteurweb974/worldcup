"use client";

import type { ScorePrediction } from "@/lib/predictions";

const clamp = (n: number) => Math.max(0, Math.min(20, n));
const SIDES = ["home", "away"] as const;

interface TeamView {
  flag: string;
  nameFr: string;
}

/** Saisie du score pronostiqué via des steppers −/+ par équipe. */
export function ScorePicker({
  home,
  away,
  value,
  onChange,
}: {
  home: TeamView;
  away: TeamView;
  value: ScorePrediction | undefined;
  onChange: (score: ScorePrediction) => void;
}) {
  const current = value ?? { home: 0, away: 0 };
  const update = (side: (typeof SIDES)[number], delta: number) =>
    onChange({ ...current, [side]: clamp(current[side] + delta) });

  return (
    <div className="grid grid-cols-2 gap-4">
      {SIDES.map((side) => {
        const team = side === "home" ? home : away;
        return (
          <div key={side} className="flex flex-col items-center gap-2">
            <span className="text-3xl" aria-hidden="true">
              {team.flag}
            </span>
            <span className="text-center text-xs font-medium leading-tight">{team.nameFr}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`Retirer un but à ${team.nameFr}`}
                onClick={() => update(side, -1)}
                className="grid h-tap w-tap place-items-center rounded-full border border-neutral-300 text-xl transition hover:border-accent active:scale-90 dark:border-neutral-700"
              >
                −
              </button>
              <span className="w-8 text-center text-3xl font-bold tabular-nums">
                <span key={current[side]} className="inline-block animate-bump">
                  {current[side]}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Ajouter un but à ${team.nameFr}`}
                onClick={() => update(side, 1)}
                className="grid h-tap w-tap place-items-center rounded-full border border-neutral-300 text-xl transition hover:border-accent active:scale-90 dark:border-neutral-700"
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
