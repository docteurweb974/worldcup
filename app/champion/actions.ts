"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMatches } from "@/lib/api";
import { championTable, championPickValidity } from "@/lib/champion";

export type ChampionState = { error?: string; ok?: boolean } | undefined;

const validGoals = (n: number) => Number.isInteger(n) && n >= 0 && n <= 20;

/** Enregistre le champion prédit + le score exact de la finale (champion-adversaire). */
export async function pickChampion(
  teamId: number,
  champGoals: number,
  oppGoals: number,
): Promise<ChampionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connecte-toi pour jouer." };

  if (!validGoals(champGoals) || !validGoals(oppGoals)) return { error: "Score invalide." };
  if (champGoals < oppGoals) {
    return { error: "Ton champion doit au moins faire match nul (il gagne la finale)." };
  }

  const matches = await getMatches();
  const { locked, teamOk } = championPickValidity(matches, teamId);
  if (locked) return { error: "Trop tard : les choix sont verrouillés (8es de finale commencés)." };
  if (!teamOk) return { error: "Cette équipe n'est plus en lice." };

  const { error } = await championTable(createAdminClient()).upsert(
    [{ user_id: user.id, team_id: teamId, champ_goals: champGoals, opp_goals: oppGoals }],
    { onConflict: "user_id" },
  );
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/champion");
  revalidatePath("/classements");
  return { ok: true };
}
