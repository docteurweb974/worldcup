"use client";

import { useState } from "react";
import { usePreferences } from "./PreferencesProvider";
import { formatTime, TIMEZONES } from "@/lib/timezone";
import type { BracketRound, BracketMatch, BracketTeam } from "@/lib/bracket";

function shortDate(iso: string, tz: keyof typeof TIMEZONES): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONES[tz],
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

function TeamRow({
  team,
  goals,
  pen,
  isWinner,
}: {
  team: BracketTeam;
  goals: number | null;
  pen: number | null;
  isWinner: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="text-lg" aria-hidden="true">{team.flag}</span>
      <span
        className={`flex-1 truncate text-sm ${
          isWinner ? "font-bold" : team.eliminated ? "text-neutral-400" : ""
        }`}
      >
        {team.fr}
      </span>
      {goals != null && (
        <span className={`shrink-0 tabular-nums ${isWinner ? "font-bold" : "font-medium"}`}>
          {goals}
          {pen != null && <sup className="ml-0.5 text-[10px] text-neutral-500">({pen})</sup>}
        </span>
      )}
    </div>
  );
}

function MatchCard({ m, tz }: { m: BracketMatch; tz: keyof typeof TIMEZONES }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="min-w-0 flex-1">
        <TeamRow team={m.home} goals={m.homeGoals} pen={m.penHome} isWinner={m.winnerId === m.home.id} />
        <div className="mx-3 h-px bg-neutral-200 dark:bg-neutral-700" />
        <TeamRow team={m.away} goals={m.awayGoals} pen={m.penAway} isWinner={m.winnerId === m.away.id} />
      </div>
      {!m.finished && (
        <div className="flex shrink-0 flex-col items-end justify-center gap-0.5 border-l border-neutral-200 px-3 text-right text-xs text-neutral-500 dark:border-neutral-700">
          <span>{shortDate(m.utcDate, tz)}</span>
          <span className="font-semibold">{formatTime(m.utcDate, tz)}</span>
        </div>
      )}
    </div>
  );
}

/** Accolade « } » reliant deux affiches → l'affiche du tour suivant. */
function Connector() {
  const line = "absolute bg-neutral-300 dark:bg-neutral-600";
  return (
    <div className="relative w-5 shrink-0" aria-hidden="true">
      {/* trait vertical reliant les centres des 2 cartes */}
      <div className={`${line} right-2 top-1/4 bottom-1/4 w-px`} />
      {/* stubs horizontaux vers chaque carte */}
      <div className={`${line} left-0 right-2 top-1/4 h-px`} />
      <div className={`${line} left-0 right-2 bottom-1/4 h-px`} />
      {/* stub central vers le tour suivant */}
      <div className={`${line} right-0 top-1/2 h-px w-2`} />
    </div>
  );
}

function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

/** Tableau des phases finales : sélecteur de tours + liste verticale des affiches. */
export function KnockoutBracket({ rounds }: { rounds: BracketRound[] }) {
  const { timezone } = usePreferences();
  const played = rounds.filter((r) => r.matches.length > 0);

  // Tour par défaut : le 1er tour qui a encore un match non terminé, sinon le dernier.
  const defaultKey =
    played.find((r) => r.matches.some((m) => !m.finished))?.key ??
    played[played.length - 1]?.key ??
    "";
  const [active, setActive] = useState(defaultKey);

  if (played.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Le tableau des phases finales s’affichera dès les 16es de finale.
      </p>
    );
  }

  const round = played.find((r) => r.key === active) ?? played[0];

  return (
    <div className="space-y-3">
      {/* Sélecteur de tours (défilable) */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {played.map((r) => {
          const sel = r.key === round.key;
          return (
            <button
              key={r.key}
              type="button"
              aria-pressed={sel}
              onClick={() => setActive(r.key)}
              className={`min-h-tap shrink-0 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors ${
                sel
                  ? "bg-accent text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Affiches du tour sélectionné (paires reliées vers le tour suivant) */}
      <div key={round.key} className="animate-fade-in space-y-4">
        {chunkPairs(round.matches).map((pair, i) => (
          <div key={i} className="flex items-stretch">
            <div className="min-w-0 flex-1 space-y-2">
              {pair.map((m, j) => (
                <MatchCard key={j} m={m} tz={timezone} />
              ))}
            </div>
            {pair.length === 2 && round.key !== "FINAL" && <Connector />}
          </div>
        ))}
      </div>
    </div>
  );
}
