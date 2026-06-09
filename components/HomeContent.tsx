"use client";

import type { CSSProperties } from "react";
import { Countdown, type SlimMatch } from "./Countdown";
import { usePreferences } from "./PreferencesProvider";
import { getPalette, type CountryPalette } from "@/data/countryColors";
import { accessibleAccent } from "@/lib/colors";
import { TEAM_BY_TLA, type Team } from "@/data/teams";

/**
 * Page d'accueil. Si une équipe favorite est choisie, la home se pare des
 * couleurs et du drapeau de cette équipe (effigie du pays). L'accent n'est
 * surchargé que localement : le reste de l'app garde l'accent par défaut.
 */
export function HomeContent({ matches }: { matches: SlimMatch[] }) {
  const { favorites } = usePreferences();
  const firstTla = favorites[0];
  const team = firstTla ? TEAM_BY_TLA[firstTla] : undefined;
  const palette = firstTla ? getPalette(firstTla) : undefined;

  // Surcharge de l'accent limitée à la page d'accueil (cascade CSS).
  const scopedStyle: CSSProperties | undefined = palette
    ? ({
        "--color-accent": accessibleAccent(palette.primary),
        "--color-accent-soft": `${palette.primary}1a`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      style={scopedStyle}
      className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6"
    >
      {team && palette ? (
        <CountryHero team={team} palette={palette} />
      ) : (
        <header className="text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Coupe du Monde 2026 <span aria-hidden="true">🏆</span>
          </h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Suivez vos équipes, du coup d&apos;envoi à la finale.
          </p>
        </header>
      )}

      <Countdown matches={matches} />
    </div>
  );
}

/** Bannière aux couleurs du pays. Voile sombre + texte blanc = lisible quelles que soient les couleurs. */
function CountryHero({ team, palette }: { team: Team; palette: CountryPalette }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8 text-center text-white shadow-lg"
      style={{ backgroundImage: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}
    >
      <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
      <div className="relative">
        <span className="text-6xl drop-shadow-md" aria-hidden="true">
          {team.flag}
        </span>
        <h1 className="mt-2 text-2xl font-bold drop-shadow-md sm:text-3xl">{team.nameFr}</h1>
        <p className="mt-1 text-sm text-white/90">
          Votre équipe pour la Coupe du Monde 2026 <span aria-hidden="true">🏆</span>
        </p>
      </div>
    </div>
  );
}
