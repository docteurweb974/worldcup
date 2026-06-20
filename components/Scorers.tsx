import type { Scorer } from "@/lib/api";
import { TEAM_BY_TLA } from "@/data/teams";

const flagOf = (tla: string | null) => (tla && TEAM_BY_TLA[tla]?.flag) || "🏳️";

/** Meilleurs buteurs de la Coupe du Monde. */
export function Scorers({ scorers }: { scorers: Scorer[] }) {
  if (scorers.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Les buteurs apparaîtront dès les premiers buts de la compétition. ⚽
      </p>
    );
  }

  return (
    <ol className="space-y-1">
      {scorers.map((s, i) => (
        <li
          key={`${s.player}-${i}`}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800"
        >
          <span className="w-6 shrink-0 text-center font-bold tabular-nums text-neutral-500">
            {i + 1}
          </span>
          <span className="text-xl" aria-hidden="true">{flagOf(s.teamTla)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{s.player}</p>
            <p className="truncate text-xs text-neutral-500">{s.teamName}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-bold tabular-nums text-accent">
              {s.goals} <span className="text-xs font-normal">⚽</span>
            </span>
            {s.assists ? (
              <span className="ml-2 text-xs text-neutral-500">{s.assists} 🅰️</span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
