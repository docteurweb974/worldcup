import { createClient } from "@/lib/supabase/server";
import { getResilientMatches } from "@/lib/results";
import { getUserBoosts } from "@/lib/boosts";
import { predictionPoints } from "@/lib/predictions";

export interface AccountSummary {
  id: string;
  username: string;
  points: number;
}

/**
 * Résumé du compte connecté : pseudo + total de points (pronos × résultats).
 * Renvoie null si personne n'est connecté. Calculé côté serveur (cookies).
 */
export async function getAccountSummary(): Promise<AccountSummary | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: preds }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    supabase.from("predictions").select("match_id, home, away").eq("user_id", user.id),
  ]);

  let points = 0;
  if (preds && preds.length > 0) {
    try {
      const [matches, { ids: boosted }] = await Promise.all([
        getResilientMatches(),
        getUserBoosts(user.id),
      ]);
      const byId = new Map(matches.map((m) => [m.id, m]));
      for (const p of preds) {
        const match = byId.get(p.match_id);
        if (!match) continue;
        const base = predictionPoints({ home: p.home, away: p.away }, match) ?? 0;
        points += boosted.has(p.match_id) ? base * 2 : base;
      }
    } catch {
      // API indisponible : on affiche 0 plutôt que de casser l'en-tête.
    }
  }

  return { id: user.id, username: profile?.username ?? "Compte", points };
}
