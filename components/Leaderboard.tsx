import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/leaderboard";

const medal = (rank: number) =>
  rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;

/** Classement des pronostiqueurs. `limit` tronque la liste avec un lien « Tout voir ». */
export function Leaderboard({
  entries,
  currentUserId,
  title = "Classement 🏆",
  limit,
  moreHref,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
  title?: string;
  limit?: number;
  moreHref?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
        <p className="font-medium">Classement vide</p>
        <p className="mt-1 text-sm text-neutral-500">Sois le premier à pronostiquer 🎯</p>
      </div>
    );
  }

  const shown = limit ? entries.slice(0, limit) : entries;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold">{title}</h2>
      <ol className="space-y-1">
        {shown.map((e) => {
          const me = e.userId === currentUserId;
          return (
            <li key={e.userId}>
              <Link
                href={`/joueur/${e.userId}`}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm transition-colors hover:border-accent ${
                  me
                    ? "border-accent bg-accent-soft font-semibold"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                <span className="w-7 shrink-0 text-center font-bold tabular-nums">
                  {medal(e.rank)}
                </span>
                <span className="truncate">
                  {e.username}
                  {me && " (toi)"}
                </span>
                {e.survivorBonus > 0 && (
                  <span
                    title={`Bonus Survivor : +${e.survivorBonus} pts`}
                    className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
                  >
                    🏆 Survivor +{e.survivorBonus} pts
                  </span>
                )}
                {e.championBonus > 0 && (
                  <span
                    title={`Bonus Prédiction : +${e.championBonus} pts`}
                    className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-400/15 dark:text-violet-300"
                  >
                    🔮 Prédiction +{e.championBonus} pts
                  </span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className="font-bold tabular-nums text-accent">{e.points} pts</span>
                {e.played > 0 && (
                  <span className="ml-2 text-xs text-neutral-500">🎯 {e.exact}</span>
                )}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
      {limit && moreHref && entries.length > limit && (
        <Link
          href={moreHref}
          className="block rounded-xl border border-neutral-200 py-2 text-center text-sm font-medium text-accent hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
        >
          Tout voir ({entries.length} joueurs)
        </Link>
      )}
    </section>
  );
}
