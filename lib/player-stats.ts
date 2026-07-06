import { createAdminClient } from "@/lib/supabase/admin";
import { isFinished, roundKey } from "@/lib/api";
import { getResilientMatches } from "@/lib/results";
import { getUserBoosts } from "@/lib/boosts";
import { getLeaderboard } from "@/lib/leaderboard";
import { getSurvivorWinners } from "@/lib/survivor";
import { getChampionBonuses } from "@/lib/champion";
import { POINTS, predictionPoints, qualifierBonus, type Qualifier } from "@/lib/predictions";
import type { PlayerStats } from "@/lib/badges";

const SURVIVOR_BONUS = 10;

const EMPTY: PlayerStats = {
  predictions: 0,
  exact: 0,
  good: 0,
  played: 0,
  points: 0,
  streak: 0,
  fullMatchdays: 0,
  rank: 0,
  hasFavorite: false,
  knockoutExact: false,
  cleanSheetExact: false,
  breakdown: { pronos: 0, boost: 0, qualifier: 0, survivor: 0, champion: 0 },
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
    admin.from("predictions").select("*").eq("user_id", userId),
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
  const { ids: boosted } = await getUserBoosts(userId);

  // Points, scores exacts et série, sur les matchs terminés (ordre chronologique).
  const finished = predList
    .map((p) => ({ p, m: byId.get(p.match_id) }))
    .filter((x) => x.m !== undefined && isFinished(x.m.status))
    .sort((a, b) => +new Date(a.m!.utcDate) - +new Date(b.m!.utcDate));

  let points = 0;
  let exact = 0;
  let good = 0;
  let streak = 0;
  let run = 0;
  let knockoutExact = false;
  let cleanSheetExact = false;
  // Décomposition.
  let bdPronos = 0;
  let bdBoost = 0;
  let bdQualifier = 0;
  for (const { p, m } of finished) {
    const qualifier = (p as { qualifier?: Qualifier | null }).qualifier ?? null;
    const base = predictionPoints({ home: p.home, away: p.away }, m!) ?? 0;
    const bonus = qualifierBonus({ home: p.home, away: p.away, qualifier }, m!);
    const isBoost = boosted.has(m!.id);
    const pts = (isBoost ? base * 2 : base) + bonus;
    points += pts;
    bdPronos += base;
    if (isBoost) bdBoost += base; // l'extra apporté par le ×2
    bdQualifier += bonus;
    if (base === POINTS.exact) {
      exact += 1;
      if (m!.stage !== "GROUP_STAGE") knockoutExact = true;
      const ft = m!.score.fullTime;
      if (ft.home === 0 || ft.away === 0) cleanSheetExact = true;
    } else if (base === POINTS.outcome) {
      good += 1;
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

  const [leaderboard, survivorWinners, championBonuses] = await Promise.all([
    getLeaderboard(),
    getSurvivorWinners(),
    getChampionBonuses(),
  ]);
  const me = leaderboard.find((e) => e.userId === userId);
  const rank = me?.rank ?? 0;
  const bdSurvivor = survivorWinners.has(userId) ? SURVIVOR_BONUS : 0;
  const bdChampion = championBonuses.get(userId) ?? 0;

  return {
    predictions: predList.length,
    exact,
    good,
    played: finished.length,
    // Total identique au classement (inclut Survivor + Prédiction) ; repli sur le calcul local.
    points: me?.points ?? points + bdSurvivor + bdChampion,
    streak,
    fullMatchdays,
    rank,
    breakdown: {
      pronos: bdPronos,
      boost: bdBoost,
      qualifier: bdQualifier,
      survivor: bdSurvivor,
      champion: bdChampion,
    },
    hasFavorite: !!profile?.favorite_team,
    knockoutExact,
    cleanSheetExact,
  };
}
