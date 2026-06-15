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

/** Tous les résumés mémorisés → Map<match_id, vidéo>. */
export async function getAllVideos(): Promise<Map<number, StoredVideo>> {
  const map = new Map<number, StoredVideo>();
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return map;
  }
  const { data } = await videoTable(admin).from("match_videos").select("match_id, youtube_id, title");
  for (const r of data ?? []) map.set(r.match_id, { youtube_id: r.youtube_id, title: r.title });
  return map;
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
type Team = { nameFr: string; tla: string };

// Playlist « uploads » de la chaîne = id de chaîne avec le préfixe UC → UU.
const UPLOADS_PLAYLIST = "UU" + BEIN_CHANNEL_ID.slice(2);

/**
 * Uploads récents de la chaîne beIN via playlistItems (1 unité de quota, fiable —
 * contrairement à search.list qui renvoie « accountDelegationForbidden »).
 */
async function fetchRecentUploads(apiKey: string): Promise<Vid[]> {
  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet` +
    `&playlistId=${UPLOADS_PLAYLIST}&maxResults=50&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    items?: { snippet: { title: string; resourceId: { videoId: string } } }[];
  };
  return (data.items ?? []).map((it) => ({
    id: it.snippet.resourceId.videoId,
    title: it.snippet.title,
  }));
}

// Résumé complet d'un match (exclut les « Résumé mi-temps »).
const resumeOf = (vids: Vid[], home: Team, away: Team): Vid | undefined =>
  vids
    .map((v) => ({ v, n: norm(v.title) }))
    .find(
      (x) =>
        x.n.includes("resume") &&
        !x.n.includes("mi-temps") &&
        teamInTitle(x.n, home) &&
        teamInTitle(x.n, away),
    )?.v;

/**
 * Pour les matchs terminés sans résumé mémorisé, apparie chacun avec un résumé
 * récent de beIN (titre « Résumé : … » + les 2 équipes). Renvoie le nb trouvés.
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

  const recent = await fetchRecentUploads(apiKey); // 1 appel couvre tous les récents
  if (recent.length === 0) return 0;

  let found = 0;
  for (const m of pending) {
    const home = teamById.get(m.homeId!);
    const away = teamById.get(m.awayId!);
    if (!home || !away) continue;
    const v = resumeOf(recent, home, away);
    if (!v) continue;
    await table
      .from("match_videos")
      .upsert([{ match_id: m.id, youtube_id: v.id, title: v.title }], { onConflict: "match_id" });
    found += 1;
  }
  return found;
}
