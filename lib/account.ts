import { createClient } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/leaderboard";

export interface AccountSummary {
  id: string;
  username: string;
  points: number;
}

/**
 * Résumé du compte connecté : pseudo + total de points.
 * Le total vient du classement (source unique : pronos + boost ×2 + bonus
 * qualifié + bonus Survivor), pour rester cohérent partout dans l'app.
 * Renvoie null si personne n'est connecté.
 */
export async function getAccountSummary(): Promise<AccountSummary | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  let points = 0;
  try {
    const leaderboard = await getLeaderboard();
    points = leaderboard.find((e) => e.userId === user.id)?.points ?? 0;
  } catch {
    // Indisponible : on affiche 0 plutôt que de casser l'en-tête.
  }

  return { id: user.id, username: profile?.username ?? "Compte", points };
}
