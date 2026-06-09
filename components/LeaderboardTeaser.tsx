/**
 * Aperçu (teaser) du futur classement des pronostics entre amis.
 * Fonctionnalité prévue en v2 (nécessitera un backend). Affiché sur l'accueil
 * et la page « Mes pronos ». Le mini-classement est fictif et flouté.
 */
const MOCK = [
  { rank: "🥇", name: "Marco", pts: 87 },
  { rank: "🥈", name: "Vous", pts: 72 },
  { rank: "🥉", name: "Léa", pts: 65 },
];

export function LeaderboardTeaser() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/90 p-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">🏅 Classement entre amis</h2>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
          Bientôt · v2
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Comparez vos points et défiez vos amis aux pronostics.
      </p>

      <div className="relative mt-3">
        <ul className="select-none space-y-1 blur-[2px]" aria-hidden="true">
          {MOCK.map((row) => (
            <li
              key={row.name}
              className="flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800"
            >
              <span>
                {row.rank} {row.name}
              </span>
              <span className="font-semibold tabular-nums">{row.pts} pts</span>
            </li>
          ))}
        </ul>
        <div className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-neutral-900/80 px-3 py-1 text-xs font-medium text-white">
            🔒 Disponible prochainement
          </span>
        </div>
      </div>
    </div>
  );
}
