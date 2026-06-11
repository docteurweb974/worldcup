import { createAdminClient } from "@/lib/supabase/admin";
import { getMatches } from "@/lib/api";
import { POINTS, predictionPoints } from "@/lib/predictions";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  exact: number;
  played: number;
  rank: number;
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
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    // Clé service_role non configurée : classement vide (l'app reste utilisable).
    return [];
  }

  const [{ data: preds }, { data: profiles }] = await Promise.all([
    admin.from("predictions").select("user_id, match_id, home, away"),
    admin.from("profiles").select("id, username"),
  ]);

  let matchesById = new Map<number, Awaited<ReturnType<typeof getMatches>>[number]>();
  try {
    const matches = await getMatches();
    matchesById = new Map(matches.map((m) => [m.id, m]));
  } catch {
    // API indisponible : les points restent à 0, le classement reste affichable.
  }

  const agg = new Map<string, { points: number; exact: number; played: number }>();

  for (const p of preds ?? []) {
    const match = matchesById.get(p.match_id);
    if (!match) continue;
    const pts = predictionPoints({ home: p.home, away: p.away }, match);
    if (pts === null) continue; // match pas terminé
    const cur = agg.get(p.user_id) ?? { points: 0, exact: 0, played: 0 };
    cur.points += pts;
    if (pts === POINTS.exact) cur.exact += 1;
    cur.played += 1;
    agg.set(p.user_id, cur);
  }

  // Tous les joueurs inscrits apparaissent (0 pt s'ils n'ont pas encore marqué).
  const entries = (profiles ?? []).map((prof) => {
    const a = agg.get(prof.id) ?? { points: 0, exact: 0, played: 0 };
    return {
      userId: prof.id,
      username: prof.username,
      points: a.points,
      exact: a.exact,
      played: a.played,
    };
  });

  // Tri : points desc, puis nombre de scores exacts desc, puis pseudo.
  entries.sort(
    (x, y) => y.points - x.points || y.exact - x.exact || x.username.localeCompare(y.username),
  );

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}
