import { BADGES, type PlayerStats } from "@/lib/badges";

/** Grille des badges : obtenus en couleur, verrouillés grisés. */
export function BadgeGrid({ stats }: { stats: PlayerStats }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {BADGES.map((b) => {
        const earned = b.earned(stats);
        return (
          <div
            key={b.id}
            className={`rounded-xl border p-3 text-center ${
              earned
                ? "border-accent bg-accent-soft"
                : "border-neutral-200 opacity-50 dark:border-neutral-800"
            }`}
          >
            <div className="text-3xl" aria-hidden="true">
              {earned ? b.emoji : "🔒"}
            </div>
            <div className="mt-1 text-sm font-semibold">{b.title}</div>
            <div className="mt-0.5 text-xs text-neutral-500">{b.description}</div>
          </div>
        );
      })}
    </div>
  );
}
