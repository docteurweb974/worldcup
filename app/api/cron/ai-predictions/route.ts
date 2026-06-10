import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMatches } from "@/lib/api";
import { predictScore } from "@/lib/ai-player";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // laisse le temps aux appels Claude

const canPredict = (status: string) => status === "SCHEDULED" || status === "TIMED";
const PER_RUN = 25; // limite par exécution pour tenir dans le temps de la fonction

/**
 * Cron : le joueur IA pronostique les matchs à venir non encore traités.
 * Sécurisé par CRON_SECRET (Vercel envoie automatiquement l'en-tête Authorization).
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
  const matches = await getMatches();
  const upcoming = matches.filter(
    (m) => canPredict(m.status) && new Date(m.utcDate).getTime() > now,
  );

  const { data: existing } = await admin
    .from("predictions")
    .select("match_id")
    .eq("user_id", botId);
  const done = new Set((existing ?? []).map((p) => p.match_id));

  const todo = upcoming
    .filter((m) => !done.has(m.id))
    .sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate))
    .slice(0, PER_RUN);

  let predicted = 0;
  for (const m of todo) {
    const score = await predictScore(m);
    if (!score) continue;
    const { error } = await admin
      .from("predictions")
      .upsert(
        { user_id: botId, match_id: m.id, home: score.home, away: score.away },
        { onConflict: "user_id,match_id" },
      );
    if (!error) predicted += 1;
  }

  return NextResponse.json({ ok: true, predicted, batch: todo.length });
}
