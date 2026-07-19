"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { persistFinalBets, type FinalBets } from "@/lib/final-bets";

export type FinalBetsState = { error?: string; ok?: boolean } | undefined;

/** Enregistre la grille de paris bonus de la finale du joueur connecté. */
export async function saveFinalBets(bets: FinalBets): Promise<FinalBetsState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connecte-toi pour jouer." };

  const ok = await persistFinalBets(user.id, bets);
  if (!ok) return { error: "Trop tard ou enregistrement impossible (finale commencée ?)." };

  revalidatePath(`/match`);
  revalidatePath("/classements");
  return { ok: true };
}
