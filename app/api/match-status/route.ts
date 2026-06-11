import { NextResponse } from "next/server";
import { isFinished, isLive } from "@/lib/api";
import { getResilientMatches } from "@/lib/results";

export const dynamic = "force-dynamic";

/**
 * Statut léger des matchs, pour l'auto-rafraîchissement du classement.
 * S'appuie sur le cache ISR de getMatches (30 s) → de nombreux clients qui
 * interrogent cette route ne déclenchent que ~2 appels/min à football-data.
 *
 * Renvoie :
 *   finishedCount : nb de matchs terminés (le client rafraîchit quand il augmente)
 *   active        : un match est en cours / vient de se jouer (vaut la peine de poller)
 *   nextKickoffMs : prochain coup d'envoi (pour que le client dorme jusque-là)
 */
export async function GET() {
  let matches;
  try {
    matches = await getResilientMatches();
  } catch {
    return NextResponse.json({ finishedCount: 0, active: false, nextKickoffMs: null });
  }

  const now = Date.now();
  const FOUR_H = 4 * 3600 * 1000;

  const finishedCount = matches.filter((m) => isFinished(m.status)).length;

  // « actif » = a commencé mais pas encore terminé (en jeu, ou coup d'envoi passé
  // depuis < 4 h sans statut terminé — football-data peut tarder à le marquer).
  const active = matches.some((m) => {
    if (isFinished(m.status)) return false;
    if (isLive(m.status)) return true;
    const k = new Date(m.utcDate).getTime();
    return k <= now && k > now - FOUR_H;
  });

  const upcoming = matches
    .map((m) => new Date(m.utcDate).getTime())
    .filter((k) => k > now)
    .sort((a, b) => a - b);
  const nextKickoffMs = upcoming.length ? upcoming[0] : null;

  return NextResponse.json({ finishedCount, active, nextKickoffMs });
}
