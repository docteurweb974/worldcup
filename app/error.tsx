"use client";

/** ErrorBoundary global de l'App Router. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      <span className="text-4xl" aria-hidden="true">
        ⚠️
      </span>
      <h2 className="text-lg font-bold">Oups, un souci est survenu</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Impossible de charger les données pour le moment. Cela vient souvent de
        l&apos;API (limite de requêtes ou indisponibilité passagère).
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-tap rounded-full bg-accent px-6 font-medium text-white"
      >
        Réessayer
      </button>
    </div>
  );
}
