"use client";

import type { CSSProperties } from "react";
import { Countdown, type SlimMatch } from "./Countdown";
import { usePreferences } from "./PreferencesProvider";
import { getPalette } from "@/data/countryColors";
import { accessibleAccent } from "@/lib/colors";
import { TEAM_BY_TLA } from "@/data/teams";

/** Image de drapeau pleine page (football-data, SVG vectoriel net). */
const flagUrl = (id: number) => `https://crests.football-data.org/${id}.svg`;

/**
 * Page d'accueil. Si une équipe favorite est choisie, toute la home devient un
 * fond d'écran à l'effigie du pays (son drapeau), avec un voile sombre pour la
 * lisibilité. Sans favori : version neutre. L'accent reste scopé à la home.
 */
export function HomeContent({ matches }: { matches: SlimMatch[] }) {
  const { favorites } = usePreferences();
  const firstTla = favorites[0];
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
        <header className="text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Coupe du Monde 2026 <span aria-hidden="true">🏆</span>
          </h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Suivez vos équipes, du coup d&apos;envoi à la finale.
          </p>
        </header>
        <Countdown matches={matches} />
      </div>
    );
  }

  return (
    <section
      style={{ ...accentVars, backgroundImage: `url(${flagUrl(team.id)})` }}
      className="relative isolate -mb-20 flex min-h-[80vh] flex-col items-center justify-center gap-6 overflow-hidden bg-cover bg-center p-4 md:-mb-6"
    >
      {/* Voile dégradé : garde le texte lisible quel que soit le drapeau. */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/40 to-black/70"
        aria-hidden="true"
      />

      <header className="text-center text-white [text-shadow:_0_2px_8px_rgb(0_0_0_/_60%)]">
        <span className="text-5xl" aria-hidden="true">
          {team.flag}
        </span>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{team.nameFr}</h1>
        <p className="mt-1 text-white/90">
          Coupe du Monde 2026 <span aria-hidden="true">🏆</span>
        </p>
      </header>

      {/* Panneau clair pour que le compte à rebours reste lisible sur l'image. */}
      <div className="w-full max-w-md rounded-2xl bg-white/90 p-2 shadow-xl backdrop-blur dark:bg-neutral-900/90">
        <Countdown matches={matches} />
      </div>
    </section>
  );
}
