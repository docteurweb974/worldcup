"use client";

import { Countdown, type SlimMatch } from "./Countdown";

/**
 * Contenu de la page d'accueil (client) : accroche, drapeau 974 discret et
 * compte à rebours du prochain match favori.
 * (Salutations créoles conditionnelles au fuseau Péi : ajoutées en étape 9.)
 */
export function HomeContent({ matches }: { matches: SlimMatch[] }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Coupe du Monde 2026 <span aria-hidden="true">🏆</span>
        </h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Suis tes équipes, du coup d&apos;envoi à la finale.{" "}
          <span aria-label="La Réunion" title="La Réunion">
            🌴
          </span>
        </p>
      </header>

      <Countdown matches={matches} />
    </div>
  );
}
