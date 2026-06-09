"use client";

import { Countdown, type SlimMatch } from "./Countdown";

/**
 * Contenu de la page d'accueil (client) : accroche et compte à rebours du
 * prochain match favori.
 */
export function HomeContent({ matches }: { matches: SlimMatch[] }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
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
