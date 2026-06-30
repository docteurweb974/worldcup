import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResilientMatches } from "@/lib/results";
import { getUserBoosts } from "@/lib/boosts";
import { predictionPoints, qualifierBonus, type Qualifier } from "@/lib/predictions";
import { isFinished, matchScore, type Match } from "@/lib/api";
import { displayTeam } from "@/data/teams";

export interface PredItem {
  matchId: number;
  homeFlag: string;
  homeFr: string;
  awayFlag: string;
  awayFr: string;
  result: string; // score final à 120' (propre, sans TAB ni a.p.)
  tab: string | null; // tirs au but « 3-4 », sinon null
  aet: boolean; // décidé en prolongation (sans TAB)
  reg: string | null; // score à 90' « 1-1 » si le match est allé au-delà
  pred: string;
  pts: number;
  boosted: boolean;
  utcDate: string;
}

export interface PredRound {
  key: string;
  label: string;
  items: PredItem[];
}

const ROUND_LABELS: Record<string, string> = {
  LAST_32: "16es de finale",
  LAST_16: "8es de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
};

function roundInfo(m: Match): { key: string; label: string } {
  if (m.stage === "GROUP_STAGE") {
    const j = m.matchday ?? 0;
    return { key: `J${j}`, label: `Journée ${j}` };
  }
  return { key: m.stage, label: ROUND_LABELS[m.stage] ?? m.stage.replaceAll("_", " ") };
}

/**
 * Pronostics d'un joueur sur les matchs TERMINÉS, regroupés par journée/tour
 * (avec points et indicateur Boost ×2). Lecture via service role (consultation
 * possible des pronos des autres joueurs, une fois les matchs joués).
 */
export async function getFinishedPredictionsByRound(userId: string): Promise<PredRound[]> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return [];
  }

  const [{ data: preds }, { ids: boosted }, matches] = await Promise.all([
    admin.from("predictions").select("*").eq("user_id", userId),
    getUserBoosts(userId),
    getResilientMatches().catch(() => []),
  ]);
  const byId = new Map(matches.map((m) => [m.id, m]));

  const grouped = new Map<string, { label: string; minDate: number; items: PredItem[] }>();
  for (const p of preds ?? []) {
    const m = byId.get(p.match_id);
    if (!m || !isFinished(m.status) || m.score.fullTime.home == null) continue;
    const qualifier = (p as { qualifier?: Qualifier | null }).qualifier ?? null;
    const base = predictionPoints({ home: p.home, away: p.away }, m) ?? 0;
    const bonus = qualifierBonus({ home: p.home, away: p.away, qualifier }, m);
    const isB = boosted.has(m.id);
    const home = displayTeam(m.homeTeam.id, m.homeTeam.name);
    const away = displayTeam(m.awayTeam.id, m.awayTeam.name);
    const ds = matchScore(m);
    const reg = m.score.regularTime;
    const item: PredItem = {
      matchId: m.id,
      homeFlag: home.flag,
      homeFr: home.nameFr,
      awayFlag: away.flag,
      awayFr: away.nameFr,
      result: `${ds.home}-${ds.away}`,
      tab: ds.penalties ? `${ds.penalties.home}-${ds.penalties.away}` : null,
      aet: ds.aet,
      reg: reg?.home != null ? `${reg.home}-${reg.away}` : null,
      pred: `${p.home}-${p.away}`,
      pts: (isB ? base * 2 : base) + bonus,
      boosted: isB,
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

  return [...grouped.entries()]
    .map(([key, g]) => ({
      key,
      label: g.label,
      minDate: g.minDate,
      items: g.items.sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate)),
    }))
    .sort((a, b) => a.minDate - b.minDate)
    .map(({ key, label, items }) => ({ key, label, items }));
}
