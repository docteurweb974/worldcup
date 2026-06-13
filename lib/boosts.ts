import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Boost : double les points d'UN match par journée de poules (J1/J2/J3).
 * Table `boosts(user_id, round_key, match_id)` — PK (user_id, round_key) = 1 par journée.
 * Accès via service role uniquement (RLS active sans policy).
 */
type BoostRow = { user_id: string; round_key: string; match_id: number };

type SelectRes = Promise<{ data: BoostRow[] | null }> & {
  eq: (col: string, val: string) => Promise<{ data: BoostRow[] | null }>;
};
type BoostTable = {
  select: (cols: string) => SelectRes;
  upsert: (rows: BoostRow[], opts: { onConflict: string }) => Promise<{ error: unknown }>;
  delete: () => {
    eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
  };
};
function boostTable(admin: ReturnType<typeof createAdminClient>) {
  return (admin as unknown as { from: (t: string) => BoostTable }).from("boosts");
}

/** Tous les boosts → Map<user_id, Set<match_id>> (pour le classement). */
export async function getAllBoosts(): Promise<Map<string, Set<number>>> {
  const map = new Map<string, Set<number>>();
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return map;
  }
  const { data } = await boostTable(admin).select("user_id, round_key, match_id");
  for (const b of data ?? []) {
    if (!map.has(b.user_id)) map.set(b.user_id, new Set());
    map.get(b.user_id)!.add(b.match_id);
  }
  return map;
}

/** Boosts d'un joueur : ids des matchs boostés + table journée → match (pour l'UI). */
export async function getUserBoosts(
  userId: string,
): Promise<{ ids: Set<number>; byRound: Record<string, number> }> {
  const ids = new Set<number>();
  const byRound: Record<string, number> = {};
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return { ids, byRound };
  }
  const { data } = await boostTable(admin).select("user_id, round_key, match_id").eq("user_id", userId);
  for (const b of data ?? []) {
    ids.add(b.match_id);
    byRound[b.round_key] = b.match_id;
  }
  return { ids, byRound };
}

/** Pose / déplace un boost (écriture brute ; la validation se fait dans l'action). */
export async function writeBoost(userId: string, roundKey: string, matchId: number): Promise<void> {
  const admin = createAdminClient();
  await boostTable(admin).upsert([{ user_id: userId, round_key: roundKey, match_id: matchId }], {
    onConflict: "user_id,round_key",
  });
}

/** Retire le boost d'une journée. */
export async function deleteBoost(userId: string, roundKey: string): Promise<void> {
  const admin = createAdminClient();
  await boostTable(admin).delete().eq("user_id", userId).eq("round_key", roundKey);
}
