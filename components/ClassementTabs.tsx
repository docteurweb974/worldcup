"use client";

import { useState } from "react";
import { Leaderboard } from "./Leaderboard";
import { Podium } from "./Podium";
import { Scorers } from "./Scorers";
import { StandingsView } from "./StandingsView";
import { KnockoutBracket } from "./KnockoutBracket";
import { LivePointsRefresher } from "./LivePointsRefresher";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import type { StandingGroup, Scorer } from "@/lib/api";
import type { BracketRound } from "@/lib/bracket";

type Tab = "pronos" | "cdm" | "buteurs";

const TABS: { key: Tab; label: string }[] = [
  { key: "pronos", label: "Pronos" },
  { key: "cdm", label: "Coupe du Monde" },
  { key: "buteurs", label: "Buteurs" },
];

export function ClassementTabs({
  leaderboard,
  currentUserId,
  standings,
  scorers,
  bracket,
}: {
  leaderboard: LeaderboardEntry[];
  currentUserId: string | null;
  standings: StandingGroup[];
  scorers: Scorer[];
  bracket: BracketRound[];
}) {
  const [tab, setTab] = useState<Tab>("pronos");
  const [cdmView, setCdmView] = useState<"finales" | "groupes">("finales");

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      <h1 className="text-center text-xl font-bold">Classement 🏆</h1>

      {/* Onglets */}
      <div
        role="tablist"
        aria-label="Type de classement"
        className="grid gap-1 rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-tap rounded-xl px-2 py-2 text-center text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-accent text-white shadow"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pronos" && (
        <div key="pronos" className="animate-fade-in space-y-4">
          <Podium top={leaderboard.slice(0, 3)} currentUserId={currentUserId} />
          <Leaderboard entries={leaderboard} currentUserId={currentUserId} title="Classement général" />
          <LivePointsRefresher />
        </div>
      )}

      {tab === "cdm" && (
        <div key="cdm" className="animate-fade-in space-y-4">
          {/* Sous-onglets Phases finales / Groupes */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-full bg-neutral-200 p-1 text-sm font-medium dark:bg-neutral-800">
              {(
                [
                  ["finales", "Phases finales"],
                  ["groupes", "Groupes"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={cdmView === v}
                  onClick={() => setCdmView(v)}
                  className={`min-h-tap rounded-full px-4 transition-colors ${
                    cdmView === v
                      ? "bg-white text-neutral-900 shadow dark:bg-neutral-950 dark:text-white"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {cdmView === "finales" ? (
            <div key="finales" className="animate-fade-in">
              <KnockoutBracket rounds={bracket} />
            </div>
          ) : (
            <div key="groupes" className="animate-fade-in">
              <StandingsView standings={standings} />
            </div>
          )}
        </div>
      )}

      {tab === "buteurs" && (
        <div key="buteurs" className="animate-fade-in">
          <Scorers scorers={scorers} />
        </div>
      )}
    </div>
  );
}
