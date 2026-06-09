"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TEAM_BY_TLA } from "@/data/teams";
import type { AuthState } from "@/app/auth/actions";

/** Modifie le pseudo (avec vérification d'unicité). */
export async function updateUsername(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  if (username.length < 2 || username.length > 24) {
    return { error: "Le pseudo doit faire entre 2 et 24 caractères." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) return { error: "Ce pseudo est déjà pris." };

  const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id);
  if (error) return { error: "Mise à jour impossible." };

  revalidatePath("/", "layout");
  revalidatePath("/profil");
  return { message: "Pseudo mis à jour ✓" };
}

/** Définit (ou retire) l'équipe favorite qui pilote le fond d'écran de la home. */
export async function updateFavoriteTeam(
  tla: string | null,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };
  if (tla !== null && !TEAM_BY_TLA[tla]) return { error: "Équipe inconnue." };

  const { error } = await supabase
    .from("profiles")
    .update({ favorite_team: tla })
    .eq("id", user.id);
  if (error) return { error: "Mise à jour impossible." };

  revalidatePath("/", "layout");
  revalidatePath("/profil");
  return { ok: true };
}
