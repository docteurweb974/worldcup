import { createAdminClient } from "@/lib/supabase/admin";
import { outcomeOfScore } from "@/lib/predictions";

export interface CommunityStats {
  total: number;
  home: number;
  draw: number;
  away: number;
}

/**
 * Répartition des pronostics de tous les joueurs sur un match (issue).
 * À n'afficher qu'après le coup d'envoi pour ne pas influencer les paris.
 */
export async function getMatchCommunity(matchId: number): Promise<CommunityStats | null> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const { data } = await admin
    .from("predictions")
    .select("home, away")
    .eq("match_id", matchId);

  const stats: CommunityStats = { total: 0, home: 0, draw: 0, away: 0 };
  for (const p of data ?? []) {
    stats.total += 1;
    const o = outcomeOfScore(p.home, p.away);
    stats[o] += 1;
  }
  return stats;
}
