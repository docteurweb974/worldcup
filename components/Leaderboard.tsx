import type { LeaderboardEntry } from "@/lib/leaderboard";

const medal = (rank: number) =>
  rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;

/** Classement complet des pronostiqueurs. */
export function Leaderboard({
  entries,
  currentUserId,
  title = "Classement 🏆",
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
  title?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
        <p className="font-medium">Classement vide</p>
        <p className="mt-1 text-sm text-neutral-500">Sois le premier à pronostiquer 🎯</p>
      </div>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold">{title}</h2>
      <ol className="space-y-1">
        {entries.map((e) => {
          const me = e.userId === currentUserId;
          return (
            <li
              key={e.userId}
              className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm ${
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
              </div>
              <div className="shrink-0 text-right">
                <span className="font-bold tabular-nums text-accent">{e.points} pts</span>
                {e.played > 0 && (
                  <span className="ml-2 text-xs text-neutral-500">🎯 {e.exact}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
