"use client";

import { useState } from "react";
import { CountUp } from "./CountUp";
import { CircularGauge } from "./CircularGauge";
import { BadgeGrid } from "./BadgeGrid";
import { PlayerPredictions } from "./PlayerPredictions";
import { UsernameForm } from "./profile/UsernameForm";
import { FavoriteTeamPicker } from "./profile/FavoriteTeamPicker";
import { HeroTeamSelector } from "./profile/HeroTeamSelector";
import { NotificationsToggle } from "./pwa/NotificationsToggle";
import { InstallButton } from "./pwa/InstallButton";
import { type PlayerStats } from "@/lib/badges";
import type { PredRound } from "@/lib/player-predictions";

type Tab = "stats" | "palmares" | "pronos" | "settings";

export function ProfileView({
  username,
  flagBg,
  rank,
  stats,
  isMe,
  predRounds,
  favoriteTla,
}: {
  username: string;
  flagBg: string | null;
  rank: number;
  stats: PlayerStats;
  isMe: boolean;
  predRounds: PredRound[];
  favoriteTla: string | null;
}) {
  const [tab, setTab] = useState<Tab>("stats");
  const pct = (n: number, d: number) => (d > 0 ? Math.round((100 * n) / d) : 0);
  const winning = stats.good + stats.exact;

  const tabs: { key: Tab; label: string }[] = [
    { key: "stats", label: "Stats" },
    { key: "palmares", label: "Palmarès" },
    { key: "pronos", label: "Pronos" },
    ...(isMe ? [{ key: "settings" as Tab, label: "Réglages" }] : []),
  ];

  return (
    <div className="animate-fade-in pb-6">
      {/* Hero : drapeau du pays favori en fond */}
      <div className="relative flex min-h-56 flex-col justify-end bg-gradient-to-br from-accent to-accent/70 px-4 pb-8 pt-10 text-center text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {flagBg && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${flagBg})` }}
            />
          )}
          {/* Voile pour la lisibilité du texte sur n'importe quel drapeau */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/70" />
        </div>
        {isMe && <HeroTeamSelector current={favoriteTla} />}
        <div className="relative drop-shadow">
          <h1 className="text-2xl font-bold">
            {username}
            {isMe && <span className="text-white/70"> (toi)</span>}
          </h1>
          {rank > 0 && (
            <p className="mt-0.5 text-sm text-white/80">
              {rank === 1 ? "🏆 1er au classement" : `${rank}ᵉ au classement`}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-2xl space-y-4 px-4">
        {/* Onglets */}
        <div
          className="grid gap-1 rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
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

        {tab === "stats" && (
          <div className="space-y-4">
            <div className="flex items-stretch gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="grid flex-1 place-items-center rounded-xl bg-accent-soft py-4">
                <CountUp value={stats.points} className="text-4xl font-bold text-accent" />
                <span className="text-xs font-semibold text-neutral-500">POINTS</span>
              </div>
              <div className="flex flex-1 flex-col justify-center gap-2 text-sm">
                <Stat icon="🎯" value={stats.played} label="Pronos" />
                <Stat icon="✅" value={stats.good} label="Bons pronos" />
                <Stat icon="💥" value={stats.exact} label="Scores exacts" />
                {stats.breakdown.survivor > 0 && (
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">🔥</span>
                    <span className="text-neutral-500">
                      Vainqueur Survivor{" "}
                      <span className="font-bold text-accent">+{stats.breakdown.survivor}pts</span>
                    </span>
                  </div>
                )}
                {stats.breakdown.champion > 0 && (
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">🔮</span>
                    <span className="text-neutral-500">
                      Prédiction finale{" "}
                      <span className="font-bold text-accent">+{stats.breakdown.champion}pts</span>
                    </span>
                  </div>
                )}
                {stats.breakdown.finalBets > 0 && (
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">🎁</span>
                    <span className="text-neutral-500">
                      Paris bonus finale{" "}
                      <span className="font-bold text-accent">+{stats.breakdown.finalBets}pts</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <CircularGauge value={winning} pct={pct(winning, stats.played)} label="Réussite" />
              <CircularGauge value={stats.good} pct={pct(stats.good, stats.played)} label="Bons pronos" />
              <CircularGauge value={stats.exact} pct={pct(stats.exact, stats.played)} label="Scores exacts" />
            </div>
          </div>
        )}

        {tab === "palmares" && <BadgeGrid stats={stats} />}

        {tab === "pronos" && <PlayerPredictions rounds={predRounds} isMe={isMe} />}

        {tab === "settings" && isMe && (
          <div className="space-y-4">
            <InstallButton />
            <NotificationsToggle />
            <section className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <h2 className="font-bold">Pseudo</h2>
              <UsernameForm current={username} />
            </section>
            <section className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <h2 className="font-bold">Mon équipe favorite</h2>
              <p className="text-sm text-neutral-500">
                Le drapeau choisi s’affiche sur ton profil et habille la page d’accueil.
              </p>
              <FavoriteTeamPicker current={favoriteTla} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true">{icon}</span>
      <span className="font-bold tabular-nums">{value}</span>
      <span className="text-neutral-500">{label}</span>
    </div>
  );
}
