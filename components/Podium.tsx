import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { TEAM_BY_TLA } from "@/data/teams";

const flagOf = (tla: string | null) => (tla && TEAM_BY_TLA[tla]?.flag) || "🏳️";

const RING: Record<number, string> = {
  1: "ring-yellow-400",
  2: "ring-neutral-300",
  3: "ring-amber-600",
};
const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const STEP: Record<number, string> = {
  1: "h-20 bg-gradient-to-b from-yellow-400 to-amber-500 text-neutral-900",
  2: "h-14 bg-white/15 text-white",
  3: "h-10 bg-white/10 text-white",
};

function Spot({
  entry,
  place,
  currentUserId,
}: {
  entry: LeaderboardEntry;
  place: number;
  currentUserId?: string | null;
}) {
  const big = place === 1;
  const me = entry.userId === currentUserId;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-end">
      <Link href={`/joueur/${entry.userId}`} className="flex min-w-0 flex-col items-center">
        <div className="relative">
          <div
            className={`grid place-items-center rounded-full bg-white/10 ring-4 backdrop-blur ${RING[place]} ${
              big ? "h-24 w-24 text-5xl" : "h-16 w-16 text-3xl"
            }`}
          >
            {flagOf(entry.favoriteTla)}
          </div>
          <span className="absolute -bottom-1 -right-1 text-xl drop-shadow">{MEDAL[place]}</span>
        </div>
        <span className={`mt-2 max-w-full truncate font-bold ${big ? "text-base" : "text-sm"}`}>
          {entry.username}
          {me && " (toi)"}
        </span>
        <span className="text-sm font-semibold text-white/90">{entry.points} pts</span>
        <span className="text-xs text-white/55">
          {entry.good} bons · {entry.exact} exacts
        </span>
        {entry.survivorBonus > 0 && (
          <span className="mt-1 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
            🏆 Survivor +{entry.survivorBonus} pts
          </span>
        )}
        {entry.championBonus > 0 && (
          <span className="mt-1 rounded-full bg-violet-400/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">
            🔮 Prédiction +{entry.championBonus} pts
          </span>
        )}
        {entry.finalBetsBonus > 0 && (
          <span className="mt-1 rounded-full bg-pink-400/20 px-1.5 py-0.5 text-[10px] font-bold text-pink-200">
            🎁 Finale +{entry.finalBetsBonus} pts
          </span>
        )}
      </Link>
      {/* Marche du podium */}
      <div
        className={`mt-2 grid w-full place-items-center rounded-t-xl font-black ${STEP[place]}`}
      >
        <span className={big ? "text-2xl" : "text-lg"}>{place}</span>
      </div>
    </div>
  );
}

/** Trio de tête du classement des pronostics, en bandeau « podium nocturne ». */
export function Podium({
  top,
  currentUserId,
}: {
  top: LeaderboardEntry[];
  currentUserId?: string | null;
}) {
  const [first, second, third] = top;
  if (!first) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-800 px-4 pt-6 text-white shadow-lg ring-1 ring-white/10">
      {/* Halo lumineux derrière le 1er */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-44 w-44 -translate-x-1/2 rounded-full bg-accent/40 blur-3xl"
      />
      <div className="relative flex items-end justify-center gap-2 sm:gap-4">
        {second && <Spot entry={second} place={2} currentUserId={currentUserId} />}
        <Spot entry={first} place={1} currentUserId={currentUserId} />
        {third && <Spot entry={third} place={3} currentUserId={currentUserId} />}
      </div>
    </div>
  );
}
