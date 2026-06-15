"use client";

import { useState } from "react";
import Link from "next/link";
import { POINTS } from "@/lib/predictions";
import type { PredRound, PredItem } from "@/lib/player-predictions";

function PredRow({ it }: { it: PredItem }) {
  const base = it.boosted ? it.pts / 2 : it.pts;
  const tone =
    base === POINTS.exact
      ? "text-green-600 dark:text-green-400"
      : base === POINTS.outcome
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return (
    <Link
      href={`/match/${it.matchId}`}
      className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm ${
        it.boosted
          ? "border-emerald-500 ring-1 ring-emerald-500"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="min-w-0">
        <p className="font-medium">
          {it.homeFlag} {it.homeFr} <span className="tabular-nums">{it.result}</span> {it.awayFr}{" "}
          {it.awayFlag}
          {it.boosted && (
            <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-xs font-bold text-white">
              ⚡ ×2
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          Pronostic : <span className="tabular-nums">{it.pred}</span>
        </p>
      </div>
      <span className={`shrink-0 font-bold tabular-nums ${tone}`}>+{it.pts}</span>
    </Link>
  );
}

/** Pronos d'un joueur sur les matchs terminés, en accordéon par journée/tour. */
export function PlayerPredictions({ rounds, isMe }: { rounds: PredRound[]; isMe: boolean }) {
  const [open, setOpen] = useState<string | null>(rounds[0]?.key ?? null);

  if (rounds.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        {isMe ? "Tu n'as" : "Ce joueur n'a"} pas encore de pronostic sur un match terminé.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rounds.map((r) => {
        const isOpen = open === r.key;
        const total = r.items.reduce((s, it) => s + it.pts, 0);
        return (
          <div
            key={r.key}
            className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : r.key)}
              className="flex min-h-tap w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              <span className="font-semibold">{r.label}</span>
              <span className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="tabular-nums">
                  {r.items.length} match{r.items.length > 1 ? "s" : ""} · {total} pts
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="space-y-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
                  {r.items.map((it) => (
                    <PredRow key={it.matchId} it={it} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
