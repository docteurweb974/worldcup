"use client";

import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { formatTime } from "@/lib/timezone";
import { displayTeam } from "@/data/teams";
import { formatGroup, isFinished, isLive, matchScore, scoreSuffix, type Match, type MatchTeam } from "@/lib/api";

function TeamSide({ team, align }: { team: MatchTeam; align: "left" | "right" }) {
  const { flag, nameFr } = displayTeam(team.id, team.name);
  return (
    <div
      className={`flex items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      <span aria-hidden="true" className="text-2xl">
        {flag}
      </span>
      <span className="text-sm font-medium leading-tight">{nameFr}</span>
    </div>
  );
}

export function MatchCard({ match, predicted = false }: { match: Match; predicted?: boolean }) {
  const { timezone } = usePreferences();
  const live = isLive(match.status);
  const finished = isFinished(match.status);
  const ds = matchScore(match);
  const suffix = scoreSuffix(ds);
  const showScore = (live || finished) && ds.home != null && ds.away != null;

  const groupLabel = match.group
    ? formatGroup(match.group)
    : match.stage.replaceAll("_", " ").toLowerCase();

  return (
    <Link
      href={`/match/${match.id}`}
      className={`block rounded-xl border p-3 transition hover:-translate-y-0.5 active:scale-[0.99] ${
        live
          ? "border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-950/30"
          : "border-neutral-200 hover:border-accent dark:border-neutral-800"
      }`}
    >
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span className="capitalize">{groupLabel}</span>
        {live && (
          <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
            DIRECT
          </span>
        )}
        {finished && <span>Terminé</span>}
        {!live && !finished && predicted && (
          <span className="font-semibold text-green-600 dark:text-green-400">✓ Pronostiqué</span>
        )}
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide team={match.homeTeam} align="right" />
        <div className="min-w-16 text-center">
          {showScore ? (
            <span className="inline-flex flex-col items-center leading-tight">
              <span className="text-xl font-bold tabular-nums">
                {ds.home} <span className="text-neutral-400">-</span> {ds.away}
              </span>
              {suffix && (
                <span className="text-[10px] font-medium uppercase text-neutral-400">{suffix}</span>
              )}
            </span>
          ) : (
            <span className="text-base font-semibold tabular-nums text-accent">
              {formatTime(match.utcDate, timezone)}
            </span>
          )}
        </div>
        <TeamSide team={match.awayTeam} align="left" />
      </div>
    </Link>
  );
}
