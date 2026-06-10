"use client";

import type { CSSProperties } from "react";
import { Countdown, type SlimMatch } from "./Countdown";
import { LeaderboardPreview } from "./LeaderboardPreview";
import { usePreferences } from "./PreferencesProvider";
import { getPalette } from "@/data/countryColors";
import { accessibleAccent } from "@/lib/colors";
import { TEAM_BY_TLA, flagImageUrl } from "@/data/teams";
import type { LeaderboardEntry } from "@/lib/leaderboard";

/**
 * Page d'accueil. Si une équipe favorite est choisie, toute la home devient un
 * fond d'écran à l'effigie du pays (son drapeau), avec un voile sombre pour la
 * lisibilité. Sans favori : version neutre. L'accent reste scopé à la home.
 */
export function HomeContent({
  matches,
  leaderboard,
  currentUserId,
  favoriteTeamTla,
}: {
  matches: SlimMatch[];
  leaderboard: LeaderboardEntry[];
  currentUserId: string | null;
  favoriteTeamTla: string | null;
}) {
  const { favorites } = usePreferences();
  // Priorité à l'équipe favorite du profil (compte) ; repli sur le localStorage.
  const firstTla = favoriteTeamTla ?? favorites[0];
  const team = firstTla ? TEAM_BY_TLA[firstTla] : undefined;
  const palette = firstTla ? getPalette(firstTla) : undefined;

  // Surcharge de l'accent limitée à la page d'accueil (cascade CSS).
  const accentVars: CSSProperties | undefined = palette
    ? ({
        "--color-accent": accessibleAccent(palette.primary),
        "--color-accent-soft": `${palette.primary}1a`,
      } as CSSProperties)
    : undefined;

  if (!team) {
    return (
      <div style={accentVars} className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
        <header className="animate-fade-in text-center">
          <h1 className="text-4xl font-bold uppercase tracking-tight sm:text-5xl">
            Coupe du Monde 2026
          </h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Suivez vos équipes, du coup d&apos;envoi à la finale.
          </p>
        </header>
        <div className="animate-fade-in" style={{ animationDelay: "0.12s" }}>
          <Countdown matches={matches} />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "0.24s" }}>
          <LeaderboardPreview entries={leaderboard} currentUserId={currentUserId} />
        </div>
      </div>
    );
  }

  return (
    <section
      style={accentVars}
      className="relative isolate -mb-20 flex min-h-[80vh] flex-col items-center justify-center gap-6 overflow-hidden p-4 md:-mb-6"
    >
      {/* Calque drapeau avec zoom lent (Ken Burns). */}
      <div
        className="absolute inset-0 -z-20 animate-kenburns bg-cover bg-center"
        style={{ backgroundImage: `url(${flagImageUrl(team)})` }}
        aria-hidden="true"
      />
      {/* Voile dégradé : garde le texte lisible quel que soit le drapeau. */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/40 to-black/70"
        aria-hidden="true"
      />

      <header className="animate-fade-in text-center text-white [text-shadow:_0_2px_8px_rgb(0_0_0_/_60%)]">
        <span className="text-5xl" aria-hidden="true">
          {team.flag}
        </span>
        <h1 className="mt-2 text-5xl font-bold uppercase tracking-tight sm:text-6xl">
          {team.nameFr}
        </h1>
        <p className="mt-1 font-semibold uppercase tracking-[0.2em] text-white/90">
          Coupe du Monde 2026
        </p>
      </header>

      {/* Panneau clair pour que le compte à rebours reste lisible sur l'image. */}
      <div
        className="w-full max-w-md animate-fade-in rounded-2xl bg-white/90 p-2 shadow-xl backdrop-blur dark:bg-neutral-900/90"
        style={{ animationDelay: "0.12s" }}
      >
        <Countdown matches={matches} />
      </div>
      <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "0.24s" }}>
        <LeaderboardPreview entries={leaderboard} currentUserId={currentUserId} />
      </div>
    </section>
  );
}
