import { NextResponse, type NextRequest } from "next/server";
import { isFinished } from "@/lib/api";
import { getResilientMatches } from "@/lib/results";
import { captureVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Recherche et mémorise les résumés vidéo (beIN) des matchs terminés qui n'en
 * ont pas encore. Pingé par GitHub Actions. Protégé par CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "YOUTUBE_API_KEY manquante" }, { status: 500 });

  let matches;
  try {
    matches = await getResilientMatches();
  } catch {
    return NextResponse.json({ error: "matchs indisponibles" }, { status: 502 });
  }

  // Limité aux matchs terminés récemment (beIN publie son résumé dans les heures
  // qui suivent) → borne le nombre de recherches YouTube (quota).
  const RECENT_MS = 12 * 3600 * 1000;
  const now = Date.now();
  const finished = matches
    .filter((m) => isFinished(m.status) && m.score.fullTime.home != null)
    .filter((m) => now - new Date(m.utcDate).getTime() < RECENT_MS)
    .map((m) => ({
      id: m.id,
      homeId: m.homeTeam.id,
      awayId: m.awayTeam.id,
      utcDate: m.utcDate,
    }));

  const found = await captureVideos(finished, apiKey);
  return NextResponse.json({ ok: true, finished: finished.length, found });
}
