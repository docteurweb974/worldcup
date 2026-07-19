import { createAdminClient } from "@/lib/supabase/admin";
import { getAllBoosts } from "@/lib/boosts";
import { isFinished, type Match } from "@/lib/api";
import { displayTeam } from "@/data/teams";
import { finalBetsTable, finalOutcomes, FINAL_BET_POINTS } from "@/lib/final-bets";
import {
  outcomeOfScore,
  predictionPoints,
  qualifierBonus,
  pointsMultiplier,
  type Qualifier,
} from "@/lib/predictions";

export interface CommunityBonusBet {
  emoji: string;
  label: string; // choix du joueur, court
  correct: boolean;
}

export interface CommunityPrediction {
  username: string;
  pred: string; // « 1-1 »
  base: number; // points du score seul (hors Boost, bonus qualifié et ×2 finale)
  qualPts: number; // bonus qualifié seul (0 ou 2, avant ×2 finale)
  pts: number; // points totaux gagnés (Boost, qualifié et ×2 finale inclus)
  qualifier: { flag: string; fr: string; correct: boolean } | null; // qualifié choisi (nul 8es+)
  boosted: boolean;
  isFinal: boolean; // finale → points comptés double
  bonusBets: CommunityBonusBet[] | null; // paris bonus (finale terminée), sinon null
  bonusPts: number; // total points des paris bonus
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
  const homeTla = match.homeTeam.tla ?? home.flag;
  const awayTla = match.awayTeam.tla ?? away.flag;

  // Paris bonus : seulement sur la FINALE terminée.
  const isFinal = match.stage === "FINAL";
  const outcomes = isFinal && finished ? finalOutcomes(match) : null;
  const betsByUser = new Map<string, Record<string, string | null>>();
  if (isFinal && finished) {
    try {
      const { data: betRows } = await finalBetsTable(admin).select("*");
      for (const r of betRows ?? [])
        betsByUser.set(r.user_id, r as unknown as Record<string, string | null>);
    } catch {
      /* table absente : pas de paris bonus */
    }
  }
  const halfLabel = (v: string) => (v === "first" ? "1re MT" : v === "second" ? "2e MT" : "Égalité");
  const ouLabel = (v: string) => (v === "over" ? "+2,5" : "-2,5");
  const bttsLabel = (v: string) => (v === "yes" ? "BTTS oui" : "BTTS non");
  const htLabel = (v: string) => (v === "home" ? `MT ${homeTla}` : v === "away" ? `MT ${awayTla}` : "MT nul");

  function bonusOf(userId: string): { bets: CommunityBonusBet[] | null; pts: number } {
    const row = betsByUser.get(userId);
    if (!outcomes || !row) return { bets: null, pts: 0 };
    const bets: CommunityBonusBet[] = [];
    let pts = 0;
    const add = (emoji: string, pick: string | null, actual: string | null, label: string) => {
      if (!pick) return;
      const ok = pick === actual;
      if (ok) pts += FINAL_BET_POINTS;
      bets.push({ emoji, label, correct: ok });
    };
    add("🔥", row.half, outcomes.half, halfLabel(row.half ?? ""));
    add("🎯", row.over_under, outcomes.overUnder, ouLabel(row.over_under ?? ""));
    add("🤝", row.btts, outcomes.btts, bttsLabel(row.btts ?? ""));
    add("⏱️", row.ht_result, outcomes.htResult, htLabel(row.ht_result ?? ""));
    return { bets: bets.length ? bets : null, pts };
  }

  const stats: CommunityStats = { total: 0, home: 0, draw: 0, away: 0, predictions: [] };
  for (const p of preds ?? []) {
    stats.total += 1;
    stats[outcomeOfScore(p.home, p.away)] += 1;
    if (!finished) continue;

    const qualifier = (p as { qualifier?: Qualifier | null }).qualifier ?? null;
    const base = predictionPoints({ home: p.home, away: p.away }, match) ?? 0;
    const bonus = qualifierBonus({ home: p.home, away: p.away, qualifier }, match);
    const isB = boosts.get(p.user_id)?.has(match.id) ?? false;
    const { bets: bonusBets, pts: bonusPts } = bonusOf(p.user_id);
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
      isFinal,
      bonusBets,
      bonusPts,
    });
  }

  // Meilleurs pronostics en tête (total = score + bonus paris finale).
  stats.predictions.sort(
    (a, b) => b.pts + b.bonusPts - (a.pts + a.bonusPts) || a.username.localeCompare(b.username),
  );
  return stats;
}
