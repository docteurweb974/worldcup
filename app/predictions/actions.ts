"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMatch, getMatches } from "@/lib/api";
import { hasQualifierOption, type Qualifier } from "@/lib/predictions";
import { deleteBoost, getUserBoosts, writeBoost } from "@/lib/boosts";

export type SaveState = { error?: string; ok?: boolean } | undefined;

const validScore = (n: number) => Number.isInteger(n) && n >= 0 && n <= 99;
const hasStarted = (utcDate: string) => new Date(utcDate).getTime() <= Date.now();

/** Enregistre (ou met à jour) le pronostic du joueur connecté pour un match. */
export async function savePrediction(
  matchId: number,
  home: number,
  away: number,
  qualifier?: Qualifier | null,
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

  // Le qualifié n'est retenu que sur un nul, en phase finale (8es+).
  const qual =
    home === away && hasQualifierOption(match.stage) && (qualifier === "home" || qualifier === "away")
      ? qualifier
      : null;

  // `qualifier` hors types générés → builder casté.
  const { error } = await (
    supabase.from("predictions") as unknown as {
      upsert: (
        r: Record<string, unknown>,
        o: { onConflict: string },
      ) => Promise<{ error: unknown }>;
    }
  ).upsert(
    { user_id: user.id, match_id: matchId, home, away, qualifier: qual },
    { onConflict: "user_id,match_id" },
  );
  if (error) return { error: "Enregistrement impossible." };

  // On ne revalide QUE la page du match (route distincte). Pas /pronos ni le
  // layout : la mise à jour est optimiste côté client, un prono ne change aucun
  // point (match à venir), et revalider /pronos réinitialiserait l'accordéon.
  revalidatePath(`/match/${matchId}`);
  return { ok: true };
}

const revalidateScores = () => {
  revalidatePath("/pronos");
  revalidatePath("/classements");
  revalidatePath("/", "layout");
};

/** Pose (ou déplace) le Boost ×2 sur un match de poules non commencé. */
export async function setBoost(matchId: number): Promise<SaveState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connecte-toi." };

  const match = await getMatch(matchId);
  if (!match) return { error: "Match introuvable." };
  if (match.stage !== "GROUP_STAGE") {
    return { error: "Le Boost n'est disponible qu'en phase de poules." };
  }
  if (hasStarted(match.utcDate)) return { error: "Trop tard : le match a commencé." };

  const roundKey = `J${match.matchday ?? 0}`;

  // Verrou : si le boost actuel de la journée porte sur un match déjà commencé.
  const { byRound } = await getUserBoosts(user.id);
  const current = byRound[roundKey];
  if (current && current !== matchId) {
    const cur = await getMatch(current);
    if (cur && hasStarted(cur.utcDate)) {
      return { error: "Boost verrouillé pour cette journée (un match a démarré)." };
    }
  }

  await writeBoost(user.id, roundKey, matchId);
  revalidateScores();
  return { ok: true };
}

/** Retire le Boost d'une journée (si le match boosté n'a pas encore commencé). */
export async function clearBoost(roundKey: string): Promise<SaveState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connecte-toi." };

  const { byRound } = await getUserBoosts(user.id);
  const current = byRound[roundKey];
  if (current) {
    const cur = await getMatch(current);
    if (cur && hasStarted(cur.utcDate)) {
      return { error: "Boost verrouillé : le match a déjà commencé." };
    }
  }

  await deleteBoost(user.id, roundKey);
  revalidateScores();
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
