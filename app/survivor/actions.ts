"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMatches } from "@/lib/api";
import { SURVIVOR_ROUNDS, roundKeyOf, survivorTable } from "@/lib/survivor";

export type SurvivorState = { error?: string; ok?: boolean } | undefined;

const started = (utcDate: string) => new Date(utcDate).getTime() <= Date.now();

/** Choisit l'équipe qui doit gagner pour ce tour du Survivor. */
export async function pickSurvivor(matchId: number, teamId: number): Promise<SurvivorState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connecte-toi." };

  const all = await getMatches();
  const m = all.find((x) => x.id === matchId);
  if (!m) return { error: "Match introuvable." };

  const roundKey = roundKeyOf(m);
  if (!(SURVIVOR_ROUNDS as readonly string[]).includes(roundKey)) {
    return { error: "Ce match ne fait pas partie du Survivor." };
  }
  if (m.homeTeam.id !== teamId && m.awayTeam.id !== teamId) {
    return { error: "Équipe invalide pour ce match." };
  }
  if (started(m.utcDate)) return { error: "Trop tard : le match a commencé." };

  const admin = createAdminClient();
  const table = survivorTable(admin);
  const { data: allPicks } = await table.select("user_id, round_key, match_id, team_id");
  const mine = (allPicks ?? []).filter((p) => p.user_id === user.id);

  // Entrée réservée à la Journée 1 : impossible de rejoindre en cours de route.
  if (roundKey !== "J1" && !mine.some((p) => p.round_key === "J1")) {
    return { error: "Tu dois rejoindre le Survivor dès la Journée 1 pour participer." };
  }

  // Non-rejeu : équipe déjà utilisée sur un AUTRE tour.
  if (mine.some((p) => p.round_key !== roundKey && p.team_id === teamId)) {
    return { error: "Tu as déjà utilisé cette équipe lors d'un autre tour." };
  }
  // Verrou : choix du tour déjà posé sur un match commencé.
  const existing = mine.find((p) => p.round_key === roundKey);
  if (existing) {
    const em = all.find((x) => x.id === existing.match_id);
    if (em && started(em.utcDate)) return { error: "Ton choix de ce tour est verrouillé." };
  }

  await table.upsert(
    [{ user_id: user.id, round_key: roundKey, match_id: matchId, team_id: teamId }],
    { onConflict: "user_id,round_key" },
  );
  revalidatePath("/survivor");
  return { ok: true };
}
