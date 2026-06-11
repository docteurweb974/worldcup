import { createAdminClient } from "@/lib/supabase/admin";
import { isFinished, roundKey } from "@/lib/api";
import { getResilientMatches } from "@/lib/results";
import { getLeaderboard } from "@/lib/leaderboard";
import { POINTS, predictionPoints } from "@/lib/predictions";
import type { PlayerStats } from "@/lib/badges";

const EMPTY: PlayerStats = {
  predictions: 0,
  exact: 0,
  points: 0,
  streak: 0,
  fullMatchdays: 0,
  rank: 0,
  hasFavorite: false,
  knockoutExact: false,
  cleanSheetExact: false,
};

/** Calcule les statistiques d'un joueur (pour ses badges et son palmarès). */
export async function getPlayerStats(userId: string): Promise<PlayerStats> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return EMPTY;
  }

  const [{ data: preds }, { data: profile }] = await Promise.all([
    admin.from("predictions").select("match_id, home, away").eq("user_id", userId),
    admin.from("profiles").select("favorite_team").eq("id", userId).maybeSingle(),
  ]);
  const predList = preds ?? [];

  let matches: Awaited<ReturnType<typeof getResilientMatches>> = [];
  try {
    matches = await getResilientMatches();
  } catch {
    /* API indisponible : stats partielles */
  }
  const byId = new Map(matches.map((m) => [m.id, m]));

  // Points, scores exacts et série, sur les matchs terminés (ordre chronologique).
  const finished = predList
    .map((p) => ({ p, m: byId.get(p.match_id) }))
    .filter((x) => x.m !== undefined && isFinished(x.m.status))
    .sort((a, b) => +new Date(a.m!.utcDate) - +new Date(b.m!.utcDate));

  let points = 0;
  let exact = 0;
  let streak = 0;
  let run = 0;
  let knockoutExact = false;
  let cleanSheetExact = false;
  for (const { p, m } of finished) {
    const pts = predictionPoints({ home: p.home, away: p.away }, m!) ?? 0;
    points += pts;
    if (pts === POINTS.exact) {
      exact += 1;
      if (m!.stage !== "GROUP_STAGE") knockoutExact = true;
      const ft = m!.score.fullTime;
      if (ft.home === 0 || ft.away === 0) cleanSheetExact = true;
    }
    if (pts > 0) {
      run += 1;
      if (run > streak) streak = run;
    } else {
      run = 0;
    }
  }

  // Journées/tours entièrement pronostiqués.
  const totalByRound = new Map<string, number>();
  for (const m of matches) {
    const k = roundKey(m);
    totalByRound.set(k, (totalByRound.get(k) ?? 0) + 1);
  }
  const predByRound = new Map<string, number>();
  for (const p of predList) {
    const m = byId.get(p.match_id);
    if (!m) continue;
    const k = roundKey(m);
    predByRound.set(k, (predByRound.get(k) ?? 0) + 1);
  }
  let fullMatchdays = 0;
  for (const [k, total] of totalByRound) {
    if (total > 0 && (predByRound.get(k) ?? 0) >= total) fullMatchdays += 1;
  }

  const leaderboard = await getLeaderboard();
  const rank = leaderboard.find((e) => e.userId === userId)?.rank ?? 0;

  return {
    predictions: predList.length,
    exact,
    points,
    streak,
    fullMatchdays,
    rank,
    hasFavorite: !!profile?.favorite_team,
    knockoutExact,
    cleanSheetExact,
  };
}
