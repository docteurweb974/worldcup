import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResilientMatches } from "@/lib/results";
import { isFinished, matchScore, type Match } from "@/lib/api";
import { displayTeam } from "@/data/teams";

// Prédis le Champion : 1 choix d'équipe + score exact de la finale.
//  - bon champion           → +10 pts
//  - bon champion + score   → +30 pts
// Verrouillage : coup d'envoi du 1er 8e de finale. Score exact = score final
// (prolongation comprise, hors tirs au but), via matchScore.
export const CHAMPION_TEAM_BONUS = 10;
export const CHAMPION_EXACT_BONUS = 30;

interface PickRow {
  user_id: string;
  team_id: number;
  champ_goals: number;
  opp_goals: number;
}

// `champion_picks` hors types générés → accès typé localement.
export function championTable(admin: ReturnType<typeof createAdminClient>) {
  return (
    admin as unknown as {
      from: (t: string) => {
        select: (c: string) => Promise<{ data: PickRow[] | null }>;
        upsert: (rows: PickRow[], opts: { onConflict: string }) => Promise<{ error: unknown }>;
      };
    }
  ).from("champion_picks");
}

const scored = (m: Match) => isFinished(m.status) && m.score.fullTime.home != null;
const isKnockout = (m: Match) => m.stage !== "GROUP_STAGE";
// Le champion se choisit parmi les équipes arrivées en 8es (et au-delà).
const FINALS_STAGES = new Set([
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
]);
const reachedEights = (m: Match) => FINALS_STAGES.has(m.stage);

/** Équipes éliminées = perdants des matchs à élimination terminés. */
function eliminatedTeamIds(matches: Match[]): Set<number> {
  const out = new Set<number>();
  for (const m of matches) {
    if (!isKnockout(m) || !scored(m)) continue;
    if (m.score.winner === "HOME_TEAM" && m.awayTeam.id != null) out.add(m.awayTeam.id);
    else if (m.score.winner === "AWAY_TEAM" && m.homeTeam.id != null) out.add(m.homeTeam.id);
  }
  return out;
}

/** Verrouillage = coup d'envoi du 1er 8e de finale (null si pas encore programmé). */
function lockTime(matches: Match[]): number | null {
  const l16 = matches.filter((m) => m.stage === "LAST_16" && m.homeTeam.id != null);
  if (l16.length === 0) return null;
  return Math.min(...l16.map((m) => new Date(m.utcDate).getTime()));
}

interface FinalResult {
  winnerId: number;
  winnerGoals: number;
  loserGoals: number;
}

/** Résultat de la finale (vainqueur + score final hors TAB), sinon null. */
function finalResult(matches: Match[]): FinalResult | null {
  const f = matches.find((m) => m.stage === "FINAL" && scored(m));
  if (!f || (f.score.winner !== "HOME_TEAM" && f.score.winner !== "AWAY_TEAM")) return null;
  const ds = matchScore(f);
  if (ds.home == null || ds.away == null) return null;
  const homeWon = f.score.winner === "HOME_TEAM";
  const winnerId = (homeWon ? f.homeTeam.id : f.awayTeam.id) as number | null;
  if (winnerId == null) return null;
  return {
    winnerId,
    winnerGoals: homeWon ? ds.home : ds.away,
    loserGoals: homeWon ? ds.away : ds.home,
  };
}

function pointsFor(pick: PickRow, fr: FinalResult | null): number {
  if (!fr || pick.team_id !== fr.winnerId) return 0;
  return pick.champ_goals === fr.winnerGoals && pick.opp_goals === fr.loserGoals
    ? CHAMPION_EXACT_BONUS
    : CHAMPION_TEAM_BONUS;
}

/** Validation côté action : le jeu est-il verrouillé ? l'équipe est-elle choisissable ? */
export function championPickValidity(
  matches: Match[],
  teamId: number,
): { locked: boolean; teamOk: boolean } {
  const lock = lockTime(matches);
  const locked = lock != null && Date.now() >= lock;
  const elim = eliminatedTeamIds(matches);
  const eightsIds = new Set<number>();
  for (const m of matches) {
    if (!reachedEights(m)) continue;
    if (m.homeTeam.id != null) eightsIds.add(m.homeTeam.id);
    if (m.awayTeam.id != null) eightsIds.add(m.awayTeam.id);
  }
  return { locked, teamOk: eightsIds.has(teamId) && !elim.has(teamId) };
}

async function loadAll() {
  const admin = createAdminClient();
  const [{ data: picks }, { data: profiles }, matches] = await Promise.all([
    championTable(admin).select("user_id, team_id, champ_goals, opp_goals"),
    admin.from("profiles").select("id, username"),
    getResilientMatches().catch(() => [] as Match[]),
  ]);
  return {
    picks: (picks ?? []) as PickRow[],
    profiles: (profiles ?? []) as { id: string; username: string }[],
    matches,
  };
}

/** Bonus Champion pour le classement (10 ou 30 pts une fois la finale jouée). */
export async function getChampionBonuses(): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let data;
  try {
    data = await loadAll();
  } catch {
    return out;
  }
  const fr = finalResult(data.matches);
  if (!fr) return out;
  for (const p of data.picks) {
    const pts = pointsFor(p, fr);
    if (pts > 0) out.set(p.user_id, pts);
  }
  return out;
}

export interface ChampionTeam {
  id: number;
  fr: string;
  flag: string;
}
export interface BracketTeam {
  id: number | null; // null = « À déterminer »
  fr: string;
  flag: string;
  code: string; // tla « ALL », « BRE »… (« ? » si à déterminer)
  eliminated: boolean;
}
export interface BracketMatch {
  home: BracketTeam;
  away: BracketTeam;
  winnerId: number | null; // équipe qualifiée (si match joué)
}
export interface BracketRound {
  key: string;
  label: string;
  matches: BracketMatch[];
}

const BRACKET_ROUNDS: [string, string][] = [
  ["LAST_16", "8es"],
  ["QUARTER_FINALS", "Quarts"],
  ["SEMI_FINALS", "Demies"],
  ["FINAL", "Finale"],
];
export interface ChampionGroup {
  team: ChampionTeam;
  usernames: string[];
}
export interface ChampionData {
  locked: boolean;
  lockAtIso: string | null;
  availableTeams: ChampionTeam[];
  bracket: BracketRound[];
  myPick: { team: ChampionTeam; champGoals: number; oppGoals: number } | null;
  alive: ChampionGroup[]; // encore en lice, regroupés par équipe
  eliminated: { username: string; team: ChampionTeam }[];
  aliveCount: number;
  totalCount: number;
  champion: ChampionTeam | null; // si finale jouée
  finalScore: string | null; // ex « 2-1 » (vainqueur-perdant)
  myState: "can-pick" | "alive" | "out" | "champion" | "missed";
  myPoints: number | null; // si finale décidée
  iWon: boolean;
}

/** Toutes les données de la page « Prédis le Champion » pour un joueur donné. */
export async function getChampionData(viewerId: string): Promise<ChampionData> {
  const empty: ChampionData = {
    locked: false,
    lockAtIso: null,
    availableTeams: [],
    bracket: [],
    myPick: null,
    alive: [],
    eliminated: [],
    aliveCount: 0,
    totalCount: 0,
    champion: null,
    finalScore: null,
    myState: "can-pick",
    myPoints: null,
    iWon: false,
  };
  let data;
  try {
    data = await loadAll();
  } catch {
    return empty;
  }
  const { picks, profiles, matches } = data;
  const nameById = new Map(profiles.map((p) => [p.id, p.username]));

  // Nom d'équipe par id (1re occurrence dans les matchs).
  const teamName = new Map<number, string | null>();
  for (const m of matches) {
    if (m.homeTeam.id != null) teamName.set(m.homeTeam.id, m.homeTeam.name);
    if (m.awayTeam.id != null) teamName.set(m.awayTeam.id, m.awayTeam.name);
  }
  const teamOf = (id: number): ChampionTeam => {
    const d = displayTeam(id, teamName.get(id) ?? null);
    return { id, fr: d.nameFr, flag: d.flag };
  };

  const elim = eliminatedTeamIds(matches);
  const lock = lockTime(matches);
  const locked = lock != null && Date.now() >= lock;
  const fr = finalResult(matches);
  const champion = fr ? teamOf(fr.winnerId) : null;

  // Équipes choisissables = équipes arrivées en 8es (et au-delà), non éliminées.
  const eightsTeamIds = new Set<number>();
  for (const m of matches) {
    if (!reachedEights(m)) continue;
    if (m.homeTeam.id != null) eightsTeamIds.add(m.homeTeam.id);
    if (m.awayTeam.id != null) eightsTeamIds.add(m.awayTeam.id);
  }
  const availableTeams = [...eightsTeamIds]
    .filter((id) => !elim.has(id))
    .map(teamOf)
    .sort((a, b) => a.fr.localeCompare(b.fr));

  // Bracket (tableau des phases finales).
  const teamFromMt = (mt: Match["homeTeam"]): BracketTeam => {
    if (mt.id == null)
      return { id: null, fr: "À déterminer", flag: "🏳️", code: "?", eliminated: false };
    const d = displayTeam(mt.id, mt.name);
    const code = mt.tla ?? d.nameFr.slice(0, 3).toUpperCase();
    return { id: mt.id, fr: d.nameFr, flag: d.flag, code, eliminated: elim.has(mt.id) };
  };
  const winnerOf = (m: Match): number | null => {
    if (!scored(m)) return null;
    if (m.score.winner === "HOME_TEAM") return m.homeTeam.id;
    if (m.score.winner === "AWAY_TEAM") return m.awayTeam.id;
    return null;
  };
  const bracket: BracketRound[] = BRACKET_ROUNDS.map(([key, label]) => ({
    key,
    label,
    matches: matches
      .filter((m) => m.stage === key)
      .sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate))
      .map((m) => ({ home: teamFromMt(m.homeTeam), away: teamFromMt(m.awayTeam), winnerId: winnerOf(m) })),
  }));

  // Joueurs : en lice (équipe non éliminée) vs éliminés.
  const groups = new Map<number, ChampionGroup>();
  const eliminated: { username: string; team: ChampionTeam }[] = [];
  let aliveCount = 0;
  for (const p of picks) {
    const username = nameById.get(p.user_id) ?? "Joueur";
    const team = teamOf(p.team_id);
    if (elim.has(p.team_id)) {
      eliminated.push({ username, team });
    } else {
      aliveCount += 1;
      if (!groups.has(p.team_id)) groups.set(p.team_id, { team, usernames: [] });
      groups.get(p.team_id)!.usernames.push(username);
    }
  }
  const alive = [...groups.values()].sort(
    (a, b) => b.usernames.length - a.usernames.length || a.team.fr.localeCompare(b.team.fr),
  );
  eliminated.sort((a, b) => a.username.localeCompare(b.username));

  const my = picks.find((p) => p.user_id === viewerId) ?? null;
  const myPick = my
    ? { team: teamOf(my.team_id), champGoals: my.champ_goals, oppGoals: my.opp_goals }
    : null;
  const myPoints = my && fr ? pointsFor(my, fr) : null;

  let myState: ChampionData["myState"];
  if (!my) myState = locked ? "missed" : "can-pick";
  else if (champion && my.team_id === champion.id) myState = "champion";
  else if (elim.has(my.team_id)) myState = "out";
  else myState = "alive";

  return {
    locked,
    lockAtIso: lock != null ? new Date(lock).toISOString() : null,
    availableTeams,
    bracket,
    myPick,
    alive,
    eliminated,
    aliveCount,
    totalCount: picks.length,
    champion,
    finalScore: fr ? `${fr.winnerGoals}-${fr.loserGoals}` : null,
    myState,
    myPoints,
    iWon: (myPoints ?? 0) > 0,
  };
}
