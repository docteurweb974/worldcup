import "server-only";
import { getResilientMatches } from "@/lib/results";
import { isFinished, matchScore, type Match } from "@/lib/api";
import { displayTeam } from "@/data/teams";

export interface BracketTeam {
  id: number | null; // null = « À déterminer »
  fr: string;
  flag: string;
  eliminated: boolean;
}
export interface BracketMatch {
  home: BracketTeam;
  away: BracketTeam;
  homeGoals: number | null; // score affiché (fin du match, hors TAB)
  awayGoals: number | null;
  penHome: number | null; // tirs au but
  penAway: number | null;
  winnerId: number | null;
  utcDate: string;
  finished: boolean;
}
export interface BracketRound {
  key: string;
  label: string;
  matches: BracketMatch[];
}

const STAGES: [string, string][] = [
  ["LAST_32", "16es de finale"],
  ["LAST_16", "8es de finale"],
  ["QUARTER_FINALS", "Quarts de finale"],
  ["SEMI_FINALS", "Demi-finales"],
  ["FINAL", "Finale"],
];

const scored = (m: Match) => isFinished(m.status) && m.score.fullTime.home != null;

/** Tableau des phases finales (16es → finale), pour l'affichage façon bracket. */
export async function getKnockoutBracket(): Promise<BracketRound[]> {
  let matches: Match[] = [];
  try {
    matches = await getResilientMatches();
  } catch {
    return [];
  }

  // Éliminés = perdants des matchs à élimination terminés.
  const elim = new Set<number>();
  for (const m of matches) {
    if (m.stage === "GROUP_STAGE" || !scored(m)) continue;
    if (m.score.winner === "HOME_TEAM" && m.awayTeam.id != null) elim.add(m.awayTeam.id);
    else if (m.score.winner === "AWAY_TEAM" && m.homeTeam.id != null) elim.add(m.homeTeam.id);
  }

  const teamFromMt = (mt: Match["homeTeam"]): BracketTeam => {
    if (mt.id == null) return { id: null, fr: "À déterminer", flag: "🏳️", eliminated: false };
    const d = displayTeam(mt.id, mt.name);
    return { id: mt.id, fr: d.nameFr, flag: d.flag, eliminated: elim.has(mt.id) };
  };
  const winnerOf = (m: Match): number | null => {
    if (!scored(m)) return null;
    if (m.score.winner === "HOME_TEAM") return m.homeTeam.id;
    if (m.score.winner === "AWAY_TEAM") return m.awayTeam.id;
    return null;
  };

  return STAGES.map(([key, label]) => ({
    key,
    label,
    matches: matches
      .filter((m) => m.stage === key)
      // Tri par id = ordre officiel du tableau (les dates mélangent les affiches).
      .sort((a, b) => a.id - b.id)
      .map((m) => {
        const fin = scored(m);
        const ds = fin ? matchScore(m) : null;
        const pen = m.score.penalties;
        return {
          home: teamFromMt(m.homeTeam),
          away: teamFromMt(m.awayTeam),
          homeGoals: ds?.home ?? null,
          awayGoals: ds?.away ?? null,
          penHome: pen?.home ?? null,
          penAway: pen?.away ?? null,
          winnerId: winnerOf(m),
          utcDate: m.utcDate,
          finished: fin,
        };
      }),
  }));
}
