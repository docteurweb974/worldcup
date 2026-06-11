import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMatches, isFinished, type Match } from "@/lib/api";

/**
 * Matchs avec des scores finaux RÉSILIENTS aux caprices de football-data
 * (offre gratuite : un match peut osciller TIMED↔FINISHED et son score
 * disparaître `null` après avoir été publié).
 *
 * Principe : dès qu'on observe un score valide, on l'enregistre dans la table
 * `match_results` (write-through). Ensuite on le réutilise toujours, même si la
 * source le perd → les points attribués ne s'effacent plus jamais.
 */
export async function getResilientMatches(): Promise<Match[]> {
  const matches = await getMatches();

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return matches; // pas de clé service : on renvoie le flux brut
  }

  // `match_results` n'est pas dans les types générés → accès typé localement.
  type ResultRow = { match_id: number; home: number; away: number };
  const db = admin as unknown as {
    from: (table: string) => {
      select: (cols: string) => Promise<{ data: ResultRow[] | null }>;
      upsert: (rows: ResultRow[], opts: { onConflict: string }) => Promise<{ error: unknown }>;
    };
  };

  // Résultats déjà mémorisés.
  const { data: stored } = await db.from("match_results").select("match_id, home, away");
  const known = new Map<number, { home: number; away: number }>(
    (stored ?? []).map((r) => [r.match_id, { home: r.home, away: r.away }]),
  );

  // Write-through : on capture les scores valides pas encore mémorisés.
  const toStore: { match_id: number; home: number; away: number }[] = [];
  for (const m of matches) {
    const h = m.score.fullTime.home;
    const a = m.score.fullTime.away;
    if (isFinished(m.status) && h != null && a != null && !known.has(m.id)) {
      known.set(m.id, { home: h, away: a });
      toStore.push({ match_id: m.id, home: h, away: a });
    }
  }
  if (toStore.length > 0) {
    await db.from("match_results").upsert(toStore, { onConflict: "match_id" });
  }

  // On superpose les scores mémorisés (et on force le statut « terminé »).
  return matches.map((m) => {
    const r = known.get(m.id);
    if (!r) return m;
    const winner =
      m.score.winner ??
      (r.home > r.away ? "HOME_TEAM" : r.home < r.away ? "AWAY_TEAM" : "DRAW");
    return {
      ...m,
      status: isFinished(m.status) ? m.status : "FINISHED",
      score: { ...m.score, winner, fullTime: { home: r.home, away: r.away } },
    };
  });
}
