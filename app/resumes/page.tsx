import { getResilientMatches } from "@/lib/results";
import { getAllVideos } from "@/lib/videos";
import { displayTeam } from "@/data/teams";
import { type Match } from "@/lib/api";
import { ResumesGallery, type ResumeItem, type ResumeSection } from "@/components/ResumesGallery";

export const dynamic = "force-dynamic";

const ROUND_LABELS: Record<string, string> = {
  LAST_32: "16es de finale",
  LAST_16: "8es de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  THIRD_PLACE: "Match pour la 3e place",
  FINAL: "Finale",
};

function roundInfo(m: Match): { key: string; label: string } {
  if (m.stage === "GROUP_STAGE") {
    const j = m.matchday ?? 0;
    return { key: `J${j}`, label: `Journée ${j}` };
  }
  return { key: m.stage, label: ROUND_LABELS[m.stage] ?? m.stage.replaceAll("_", " ") };
}

export default async function ResumesPage() {
  const [matches, videos] = await Promise.all([getResilientMatches(), getAllVideos()]);
  const byId = new Map(matches.map((m) => [m.id, m]));

  // Construit un item par résumé, rattaché à son tour.
  const grouped = new Map<string, { label: string; minDate: number; items: ResumeItem[] }>();
  for (const [matchId, v] of videos) {
    const m = byId.get(matchId);
    if (!m) continue;
    const home = displayTeam(m.homeTeam.id, m.homeTeam.name);
    const away = displayTeam(m.awayTeam.id, m.awayTeam.name);
    const ft = m.score.fullTime;
    const item: ResumeItem = {
      matchId,
      youtubeId: v.youtube_id,
      title: v.title,
      homeFlag: home.flag,
      homeFr: home.nameFr,
      awayFlag: away.flag,
      awayFr: away.nameFr,
      score: ft.home != null && ft.away != null ? `${ft.home} - ${ft.away}` : null,
      utcDate: m.utcDate,
    };
    const { key, label } = roundInfo(m);
    const t = new Date(m.utcDate).getTime();
    const g = grouped.get(key);
    if (g) {
      g.items.push(item);
      g.minDate = Math.min(g.minDate, t);
    } else {
      grouped.set(key, { label, minDate: t, items: [item] });
    }
  }

  const sections: ResumeSection[] = [...grouped.entries()]
    .map(([key, g]) => ({
      key,
      label: g.label,
      minDate: g.minDate,
      items: g.items.sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate)),
    }))
    .sort((a, b) => a.minDate - b.minDate) // J1, J2, J3, 16es, 8es…
    .map(({ key, label, items }) => ({ key, label, items }));

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Résumés des matchs 🎬</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Les résumés vidéo (beIN SPORTS), classés par journée. Fais défiler chaque ligne ↔
        </p>
      </div>
      <ResumesGallery sections={sections} />
    </div>
  );
}
