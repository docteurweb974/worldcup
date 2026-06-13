import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEAMS } from "@/data/teams";

// Chaîne beIN SPORTS France (résumés de la Coupe du Monde, intégrables, FR + DOM-TOM).
const BEIN_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCfj4kQ6_mYO5r4hzX5KloVw";

const teamById = new Map(TEAMS.map((t) => [t.id, t]));

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[áàâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();

export interface StoredVideo {
  youtube_id: string;
  title: string;
}

// `match_videos` n'est pas dans les types générés → accès typé localement.
type VideoRow = { match_id: number; youtube_id: string; title: string };
type SingleRes = Promise<{ data: VideoRow | null }>;
type SelectRes = Promise<{ data: VideoRow[] | null }> & {
  eq: (col: string, val: number) => { maybeSingle: () => SingleRes };
};
type VideoTable = {
  select: (cols: string) => SelectRes;
  upsert: (rows: VideoRow[], opts: { onConflict: string }) => Promise<{ error: unknown }>;
};
function videoTable(admin: ReturnType<typeof createAdminClient>) {
  return admin as unknown as { from: (t: string) => VideoTable };
}

/** Résumé vidéo mémorisé pour un match (pour l'affichage de la page). */
export async function getStoredVideo(matchId: number): Promise<StoredVideo | null> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }
  const { data } = await videoTable(admin)
    .from("match_videos")
    .select("match_id, youtube_id, title")
    .eq("match_id", matchId)
    .maybeSingle();
  return data ? { youtube_id: data.youtube_id, title: data.title } : null;
}

/** Une équipe est-elle citée dans le titre ? Nom français OU code 3 lettres (USA, CAN…). */
function teamInTitle(normTitle: string, team: { nameFr: string; tla: string }): boolean {
  if (normTitle.includes(norm(team.nameFr))) return true;
  return new RegExp(`\\b${team.tla.toLowerCase()}\\b`).test(normTitle);
}

type Vid = { id: string; title: string };

async function ytSearch(query: string, max: number, apiKey: string): Promise<Vid[]> {
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${BEIN_CHANNEL_ID}` +
    `&q=${encodeURIComponent(query)}&type=video&order=date&maxResults=${max}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    items?: { id: { videoId: string }; snippet: { title: string } }[];
  };
  return (data.items ?? []).map((it) => ({ id: it.id.videoId, title: it.snippet.title }));
}

type Team = { nameFr: string; tla: string };
const resumeOf = (vids: Vid[], home: Team, away: Team): Vid | undefined =>
  vids
    .map((v) => ({ v, n: norm(v.title) }))
    .find((x) => x.n.includes("resume") && teamInTitle(x.n, home) && teamInTitle(x.n, away))?.v;

/**
 * Pour les matchs terminés sans résumé mémorisé, apparie chacun avec un résumé
 * récent de beIN (titre contenant « résumé » + les 2 équipes). Renvoie le nb trouvés.
 */
export async function captureVideos(
  finished: { id: number; homeId: number | null; awayId: number | null; utcDate: string }[],
  apiKey: string,
): Promise<number> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return 0;
  }
  const table = videoTable(admin);

  const { data: stored } = await table.from("match_videos").select("match_id, youtube_id, title");
  const known = new Set((stored ?? []).map((r) => r.match_id));

  const pending = finished.filter(
    (m) => !known.has(m.id) && m.homeId != null && m.awayId != null,
  );
  if (pending.length === 0) return 0;

  // 1 recherche large → couvre la plupart des résumés récents (économe en quota).
  const recent = await ytSearch("résumé", 50, apiKey);

  const store = async (matchId: number, v: Vid) => {
    await table
      .from("match_videos")
      .upsert([{ match_id: matchId, youtube_id: v.id, title: v.title }], { onConflict: "match_id" });
  };

  let found = 0;
  const stillMissing: { id: number; home: Team; away: Team }[] = [];
  for (const m of pending) {
    const home = teamById.get(m.homeId!);
    const away = teamById.get(m.awayId!);
    if (!home || !away) continue;
    const v = resumeOf(recent, home, away);
    if (v) {
      await store(m.id, v);
      found += 1;
    } else {
      stillMissing.push({ id: m.id, home, away });
    }
  }

  // Repli ciblé pour ceux que la recherche large a ratés (plafonné → quota maîtrisé).
  const MAX_TARGETED = 3;
  for (const m of stillMissing.slice(0, MAX_TARGETED)) {
    const q = `${m.home.nameFr} ${m.away.nameFr} ${m.home.tla} ${m.away.tla} résumé`;
    const v = resumeOf(await ytSearch(q, 10, apiKey), m.home, m.away);
    if (v) {
      await store(m.id, v);
      found += 1;
    }
  }
  return found;
}
