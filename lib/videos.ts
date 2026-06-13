import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEAMS } from "@/data/teams";

// Chaîne beIN SPORTS France (résumés de la Coupe du Monde, intégrables, FR + DOM-TOM).
const BEIN_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCfj4kQ6_mYO5r4hzX5KloVw";

const nameFrById = new Map(TEAMS.map((t) => [t.id, t.nameFr]));

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
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

/**
 * Cherche sur la chaîne beIN le résumé d'un match (titre type
 * « Résumé : MEXIQUE - AFRIQUE DU SUD … »). Renvoie l'ID vidéo ou null.
 */
export async function findHighlight(
  homeFr: string,
  awayFr: string,
  afterISO: string,
  apiKey: string,
): Promise<StoredVideo | null> {
  const q = encodeURIComponent(`${homeFr} ${awayFr} résumé`);
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${BEIN_CHANNEL_ID}` +
    `&q=${q}&type=video&order=date&maxResults=10&publishedAfter=${encodeURIComponent(afterISO)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    items?: { id: { videoId: string }; snippet: { title: string } }[];
  };
  const h = norm(homeFr);
  const a = norm(awayFr);
  for (const it of data.items ?? []) {
    const t = norm(it.snippet.title);
    if (t.includes("resume") && t.includes(h) && t.includes(a)) {
      return { youtube_id: it.id.videoId, title: it.snippet.title };
    }
  }
  return null;
}

/**
 * Pour une liste de matchs terminés, recherche et mémorise les résumés manquants.
 * Renvoie le nombre de nouveaux résumés trouvés.
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

  // Résumés déjà connus.
  const { data: stored } = await table.from("match_videos").select("match_id, youtube_id, title");
  const known = new Set((stored ?? []).map((r) => r.match_id));

  let found = 0;
  for (const m of finished) {
    if (known.has(m.id) || m.homeId == null || m.awayId == null) continue;
    const homeFr = nameFrById.get(m.homeId);
    const awayFr = nameFrById.get(m.awayId);
    if (!homeFr || !awayFr) continue;
    const video = await findHighlight(homeFr, awayFr, m.utcDate, apiKey);
    if (video) {
      await table
        .from("match_videos")
        .upsert([{ match_id: m.id, youtube_id: video.youtube_id, title: video.title }], {
          onConflict: "match_id",
        });
      found += 1;
    }
  }
  return found;
}
