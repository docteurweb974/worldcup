import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/leaderboard";

const medal = (rank: number) =>
  rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;

function Row({ e, me }: { e: LeaderboardEntry; me: boolean }) {
  return (
    <li
      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
        me ? "bg-accent-soft font-semibold" : "bg-neutral-100 dark:bg-neutral-800"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="w-6 text-center font-bold tabular-nums">{medal(e.rank)}</span>
        <span className="truncate">
          {e.username}
          {me && " (toi)"}
        </span>
      </span>
      <span className="shrink-0 font-bold tabular-nums text-accent">{e.points} pts</span>
    </li>
  );
}

/** Aperçu du classement (top 3 + ta position) pour la page d'accueil. */
export function LeaderboardPreview({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
}) {
  const top = entries.slice(0, 3);
  const mine = currentUserId ? entries.find((e) => e.userId === currentUserId) : undefined;
  const showMine = mine && mine.rank > 3;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/90 p-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Classement 🏆</h2>
        <Link href="/classements" className="text-sm font-medium text-accent">
          Tout voir
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Sois le premier à pronostiquer 🎯</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {top.map((e) => (
            <Row key={e.userId} e={e} me={e.userId === currentUserId} />
          ))}
          {showMine && <Row e={mine} me />}
        </ol>
      )}
    </div>
  );
}
