import { createAdminClient } from "@/lib/supabase/admin";
import { getAllBoosts } from "@/lib/boosts";
import { isFinished, type Match } from "@/lib/api";
import { displayTeam } from "@/data/teams";
import {
  outcomeOfScore,
  predictionPoints,
  qualifierBonus,
  pointsMultiplier,
  type Qualifier,
} from "@/lib/predictions";

export interface CommunityPrediction {
  username: string;
  pred: string; // « 1-1 »
  base: number; // points du score seul (hors Boost, bonus qualifié et ×2 finale)
  qualPts: number; // bonus qualifié seul (0 ou 2, avant ×2 finale)
  pts: number; // points totaux gagnés (Boost, qualifié et ×2 finale inclus)
  qualifier: { flag: string; fr: string; correct: boolean } | null; // qualifié choisi (nul 8es+)
  boosted: boolean;
  isFinal: boolean; // finale → points comptés double
}

export interface CommunityStats {
  total: number;
  home: number;
  draw: number;
  away: number;
  // Détail par joueur — rempli uniquement si le match est terminé (sinon []).
  predictions: CommunityPrediction[];
}

/**
 * Répartition des pronostics de tous les joueurs sur un match (issue) + le
 * détail par joueur. Le détail (scores/qualifiés/points) n'est renvoyé QUE si le
 * match est terminé, pour ne pas dévoiler les paris en amont.
 */
export async function getMatchCommunity(match: Match): Promise<CommunityStats | null> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const finished = isFinished(match.status);
  const [{ data: preds }, { data: profiles }, boosts] = await Promise.all([
    admin.from("predictions").select("*").eq("match_id", match.id),
    admin.from("profiles").select("id, username"),
    finished ? getAllBoosts() : Promise.resolve(new Map<string, Set<number>>()),
  ]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.username]));
  const home = displayTeam(match.homeTeam.id, match.homeTeam.name);
  const away = displayTeam(match.awayTeam.id, match.awayTeam.name);

  const stats: CommunityStats = { total: 0, home: 0, draw: 0, away: 0, predictions: [] };
  for (const p of preds ?? []) {
    stats.total += 1;
    stats[outcomeOfScore(p.home, p.away)] += 1;
    if (!finished) continue;

    const qualifier = (p as { qualifier?: Qualifier | null }).qualifier ?? null;
    const base = predictionPoints({ home: p.home, away: p.away }, match) ?? 0;
    const bonus = qualifierBonus({ home: p.home, away: p.away, qualifier }, match);
    const isB = boosts.get(p.user_id)?.has(match.id) ?? false;
    stats.predictions.push({
      username: nameById.get(p.user_id) ?? "Joueur",
      pred: `${p.home}-${p.away}`,
      base,
      qualPts: bonus,
      pts: ((isB ? base * 2 : base) + bonus) * pointsMultiplier(match.stage),
      qualifier: qualifier
        ? {
            flag: qualifier === "home" ? home.flag : away.flag,
            fr: qualifier === "home" ? home.nameFr : away.nameFr,
            correct: bonus > 0,
          }
        : null,
      boosted: isB,
      isFinal: match.stage === "FINAL",
    });
  }

  // Meilleurs pronostics en tête.
  stats.predictions.sort((a, b) => b.pts - a.pts || a.username.localeCompare(b.username));
  return stats;
}
