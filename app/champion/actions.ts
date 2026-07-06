"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMatches } from "@/lib/api";
import { championTable, championPickValidity } from "@/lib/champion";

export type ChampionState = { error?: string; ok?: boolean } | undefined;

const validGoals = (n: number) => Number.isInteger(n) && n >= 0 && n <= 20;

/** Enregistre la finale prédite : champion + finaliste + score exact (champion-finaliste). */
export async function pickChampion(
  teamId: number,
  finalistId: number,
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
  const { locked, championOk, finalistOk, coherent } = championPickValidity(
    matches,
    teamId,
    finalistId,
  );
  if (locked) return { error: "Trop tard : les choix sont verrouillés (8es de finale terminés)." };
  if (!championOk || !finalistOk) return { error: "Une de tes équipes n'est plus en lice." };
  if (!coherent) {
    return { error: "Champion et finaliste doivent venir de moitiés opposées du tableau." };
  }

  const { error } = await championTable(createAdminClient()).upsert(
    [
      {
        user_id: user.id,
        team_id: teamId,
        finalist_id: finalistId,
        champ_goals: champGoals,
        opp_goals: oppGoals,
      },
    ],
    { onConflict: "user_id" },
  );
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/champion");
  revalidatePath("/classements");
  return { ok: true };
}
