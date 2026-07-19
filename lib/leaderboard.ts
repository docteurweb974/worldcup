import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResilientMatches } from "@/lib/results";
import { getAllBoosts } from "@/lib/boosts";
import { getSurvivorWinners } from "@/lib/survivor";
import { getChampionBonuses } from "@/lib/champion";
import { getFinalBetsBonuses } from "@/lib/final-bets";
import { POINTS, predictionPoints, qualifierBonus, pointsMultiplier, type Qualifier } from "@/lib/predictions";

const SURVIVOR_BONUS = 10;

export interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  exact: number;
  good: number;
  played: number;
  rank: number;
  favoriteTla: string | null;
  survivorBonus: number; // bonus Survivor inclus dans les points (0 si aucun)
  championBonus: number; // bonus Prédiction (finale) inclus dans les points (0 si aucun)
  finalBetsBonus: number; // bonus paris de la finale inclus dans les points (0 si aucun)
}

/**
 * Classement global : pour chaque joueur ayant pronostiqué, somme des points
 * (pronos × résultats × barème). Calculé côté serveur ; n'expose que des totaux.
 */
/**
 * Calculé à chaque requête (pas de cache séparé) pour rester cohérent avec le
 * reste de la page : l'appel lourd à football-data reste mis en cache 30 s via
 * getMatches ; le reste n'est qu'une agrégation de quelques requêtes Supabase.
 */
export const getLeaderboard = cache(async (): Promise<LeaderboardEntry[]> => {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    // Clé service_role non configurée : classement vide (l'app reste utilisable).
    return [];
  }

  const [
    { data: preds },
    { data: profiles },
    boosts,
    survivorWinners,
    championBonuses,
    finalBetsBonuses,
  ] = await Promise.all([
    admin.from("predictions").select("*"),
    admin.from("profiles").select("id, username, favorite_team"),
    getAllBoosts(),
    getSurvivorWinners(),
    getChampionBonuses(),
    getFinalBetsBonuses(),
  ]);

  let matchesById = new Map<number, Awaited<ReturnType<typeof getResilientMatches>>[number]>();
  try {
    const matches = await getResilientMatches();
    matchesById = new Map(matches.map((m) => [m.id, m]));
  } catch {
    // API indisponible : les points restent à 0, le classement reste affichable.
  }

  const agg = new Map<string, { points: number; exact: number; good: number; played: number }>();

  for (const p of preds ?? []) {
    const match = matchesById.get(p.match_id);
    if (!match) continue;
    const base = predictionPoints({ home: p.home, away: p.away }, match);
    if (base === null) continue; // match pas terminé
    const boosted = boosts.get(p.user_id)?.has(p.match_id) ?? false;
    const bonus = qualifierBonus(
      { home: p.home, away: p.away, qualifier: (p as { qualifier?: Qualifier | null }).qualifier ?? null },
      match,
    );
    const cur = agg.get(p.user_id) ?? { points: 0, exact: 0, good: 0, played: 0 };
    cur.points += ((boosted ? base * 2 : base) + bonus) * pointsMultiplier(match.stage);
    if (base === POINTS.exact) cur.exact += 1;
    else if (base === POINTS.outcome) cur.good += 1;
    cur.played += 1;
    agg.set(p.user_id, cur);
  }

  // Tous les joueurs inscrits apparaissent (0 pt s'ils n'ont pas encore marqué).
  const entries = (profiles ?? []).map((prof) => {
    const a = agg.get(prof.id) ?? { points: 0, exact: 0, good: 0, played: 0 };
    const survivorBonus = survivorWinners.has(prof.id) ? SURVIVOR_BONUS : 0;
    const championBonus = championBonuses.get(prof.id) ?? 0;
    const finalBetsBonus = finalBetsBonuses.get(prof.id) ?? 0;
    return {
      userId: prof.id,
      username: prof.username,
      points: a.points + survivorBonus + championBonus + finalBetsBonus,
      exact: a.exact,
      good: a.good,
      played: a.played,
      favoriteTla: (prof as { favorite_team?: string | null }).favorite_team ?? null,
      survivorBonus,
      championBonus,
      finalBetsBonus,
    };
  });

  // Tri : points desc, puis nombre de scores exacts desc, puis pseudo.
  entries.sort(
    (x, y) => y.points - x.points || y.exact - x.exact || x.username.localeCompare(y.username),
  );

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
});
