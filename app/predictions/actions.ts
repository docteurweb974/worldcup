"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMatch, getMatches } from "@/lib/api";

export type SaveState = { error?: string; ok?: boolean } | undefined;

const validScore = (n: number) => Number.isInteger(n) && n >= 0 && n <= 99;
const hasStarted = (utcDate: string) => new Date(utcDate).getTime() <= Date.now();

/** Enregistre (ou met à jour) le pronostic du joueur connecté pour un match. */
export async function savePrediction(
  matchId: number,
  home: number,
  away: number,
): Promise<SaveState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connecte-toi pour pronostiquer." };
  if (!validScore(home) || !validScore(away)) return { error: "Score invalide." };

  const match = await getMatch(matchId);
  if (!match) return { error: "Match introuvable." };
  if (hasStarted(match.utcDate)) {
    return { error: "Trop tard : le match a déjà commencé." };
  }

  const { error } = await supabase
    .from("predictions")
    .upsert({ user_id: user.id, match_id: matchId, home, away }, { onConflict: "user_id,match_id" });
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath(`/match/${matchId}`);
  revalidatePath("/pronos");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Importe des pronostics depuis le localStorage (migration V1 → V2).
 * Ignore les matchs déjà commencés et les scores invalides (anti-triche).
 */
export async function importPredictions(
  items: { matchId: number; home: number; away: number }[],
): Promise<{ imported: number; skipped: number } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const all = await getMatches();
  const byId = new Map(all.map((m) => [m.id, m]));
  const now = Date.now();

  const rows: { user_id: string; match_id: number; home: number; away: number }[] = [];
  let skipped = 0;
  for (const it of items) {
    const match = byId.get(it.matchId);
    if (!match || hasStarted(match.utcDate) || !validScore(it.home) || !validScore(it.away)) {
      skipped++;
      continue;
    }
    rows.push({ user_id: user.id, match_id: it.matchId, home: it.home, away: it.away });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("predictions")
      .upsert(rows, { onConflict: "user_id,match_id" });
    if (error) return { error: "Import impossible." };
  }

  revalidatePath("/pronos");
  revalidatePath("/", "layout");
  return { imported: rows.length, skipped };
}
