import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMatches, getStandings } from "@/lib/api";
import { predictBatch } from "@/lib/ai-player";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const canPredict = (status: string) => status === "SCHEDULED" || status === "TIMED";
const WINDOW_MS = 48 * 60 * 60 * 1000; // fenêtre de 48 h
const MAX_BATCH = 30; // borne le lot (tokens de sortie)

/**
 * Cron quotidien : le joueur IA pronostique les matchs débutant dans les ~48 h,
 * non encore traités, en s'appuyant sur les résultats et classements à jour.
 * Sécurisé par CRON_SECRET (Vercel envoie l'en-tête Authorization automatiquement).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const botId = process.env.AI_BOT_USER_ID;
  if (!botId) return NextResponse.json({ error: "AI_BOT_USER_ID manquant" }, { status: 500 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante" }, { status: 500 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "service_role manquante" }, { status: 500 });
  }

  const now = Date.now();
  const [matches, standings, { data: existing }] = await Promise.all([
    getMatches(),
    getStandings().catch(() => []),
    admin.from("predictions").select("match_id").eq("user_id", botId),
  ]);

  const done = new Set((existing ?? []).map((p) => p.match_id));
  const targets = matches
    .filter((m) => canPredict(m.status) && !done.has(m.id))
    .filter((m) => {
      const t = new Date(m.utcDate).getTime();
      return t > now && t <= now + WINDOW_MS;
    })
    .sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate))
    .slice(0, MAX_BATCH);

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, predicted: 0, batch: 0 });
  }

  const scores = await predictBatch(targets, matches, standings);

  let predicted = 0;
  for (const [matchId, score] of scores) {
    const { error } = await admin
      .from("predictions")
      .upsert(
        { user_id: botId, match_id: matchId, home: score.home, away: score.away },
        { onConflict: "user_id,match_id" },
      );
    if (!error) predicted += 1;
  }

  return NextResponse.json({ ok: true, predicted, batch: targets.length });
}
