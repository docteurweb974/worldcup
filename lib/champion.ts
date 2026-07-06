import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResilientMatches } from "@/lib/results";
import { isFinished, matchScore, type Match } from "@/lib/api";
import { displayTeam } from "@/data/teams";

// Prédis la finale : choisis les 2 équipes qui iront en finale (1 de chaque
// moitié du tableau), désigne le vainqueur, mets le score.
//  - bonne affiche (les 2 finalistes)  → +10 pts   (tout ou rien, ordre libre)
//  - bon champion (le vainqueur)        → +10 pts
//  - bon champion + score exact         → +20 pts (en plus) → « tout bon » = 40 pts
// Cohérence : les deux finalistes viennent de moitiés opposées du bracket.
// Verrouillage : fin du dernier 8e de finale.
export const CHAMPION_TEAM_BONUS = 10;
export const CHAMPION_FINALIST_BONUS = 10;
export const CHAMPION_EXACT_BONUS = 20;

interface PickRow {
  user_id: string;
  team_id: number; // équipe championne prédite
  finalist_id: number | null; // finaliste (vice-champion) prédit
  champ_goals: number;
  opp_goals: number;
}

// `champion_picks` hors types générés → accès typé localement.
export function championTable(admin: ReturnType<typeof createAdminClient>) {
  return (
    admin as unknown as {
      from: (t: string) => {
        select: (c: string) => Promise<{ data: PickRow[] | null }>;
        upsert: (
          rows: Record<string, unknown>[],
          opts: { onConflict: string },
        ) => Promise<{ error: unknown }>;
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

/**
 * Verrouillage = fin du dernier 8e de finale (≈ coup d'envoi du dernier 8e
 * + 150 min pour couvrir prolongation/TAB). Null si les 8es ne sont pas encore
 * programmés → le jeu reste ouvert.
 */
const LOCK_BUFFER_MS = 150 * 60 * 1000;
function lockTime(matches: Match[]): number | null {
  const l16 = matches.filter((m) => m.stage === "LAST_16" && m.utcDate);
  if (l16.length === 0) return null;
  const lastKickoff = Math.max(...l16.map((m) => new Date(m.utcDate).getTime()));
  return lastKickoff + LOCK_BUFFER_MS;
}

interface FinalResult {
  winnerId: number;
  loserId: number; // finaliste (vice-champion) réel
  winnerGoals: number;
  loserGoals: number;
}

/** Résultat de la finale (vainqueur + finaliste + score final hors TAB), sinon null. */
function finalResult(matches: Match[]): FinalResult | null {
  const f = matches.find((m) => m.stage === "FINAL" && scored(m));
  if (!f || (f.score.winner !== "HOME_TEAM" && f.score.winner !== "AWAY_TEAM")) return null;
  const ds = matchScore(f);
  if (ds.home == null || ds.away == null) return null;
  const homeWon = f.score.winner === "HOME_TEAM";
  const winnerId = (homeWon ? f.homeTeam.id : f.awayTeam.id) as number | null;
  const loserId = (homeWon ? f.awayTeam.id : f.homeTeam.id) as number | null;
  if (winnerId == null || loserId == null) return null;
  return {
    winnerId,
    loserId,
    winnerGoals: homeWon ? ds.home : ds.away,
    loserGoals: homeWon ? ds.away : ds.home,
  };
}

/**
 * Barème additif :
 *  +10 bonne affiche (les 2 finalistes réels, ordre libre)
 *  +10 bon champion (le vainqueur réel)
 *  +20 bon champion + score exact.
 * Le score exact ne compte que si le champion est correct.
 */
function pointsFor(pick: PickRow, fr: FinalResult | null): number {
  if (!fr) return 0;
  let pts = 0;

  // Bonne affiche : les 2 équipes prédites = les 2 finalistes réels (peu importe l'ordre).
  const goodMatchup =
    pick.finalist_id != null &&
    ((pick.team_id === fr.winnerId && pick.finalist_id === fr.loserId) ||
      (pick.team_id === fr.loserId && pick.finalist_id === fr.winnerId));
  if (goodMatchup) pts += CHAMPION_FINALIST_BONUS;

  // Bon champion (+ score exact).
  if (pick.team_id === fr.winnerId) {
    pts += CHAMPION_TEAM_BONUS;
    if (pick.champ_goals === fr.winnerGoals && pick.opp_goals === fr.loserGoals) {
      pts += CHAMPION_EXACT_BONUS;
    }
  }
  return pts;
}

/**
 * Moitié du bracket (« L »/« R ») par 8e (triés par id = ordre officiel).
 * Le tableau est ENTRELACÉ : deux 8es consécutifs forment un quart, et les
 * quarts alternent de côté (demie gauche = quarts 0 & 2, demie droite = 1 & 3).
 * D'où le côté d'un 8e d'indice i : gauche si floor(i/2) est pair.
 * Ex. 375/376 → gauche, 377/378 → droite, 379/380 → gauche, 381/382 → droite.
 */
function last16Side(i: number): "L" | "R" {
  return Math.floor(i / 2) % 2 === 0 ? "L" : "R";
}

/**
 * Côté d'un match selon son tour (matchs triés par id dans le tour).
 * - 8es : numérotation ENTRELACÉE (LLRRLLRR) → floor(i/2) pair = gauche.
 * - Quarts / demies : numérotation en BLOC → 1re moitié = gauche.
 * (Vérifié sur l'API : QF 537383 France–Maroc = gauche, 537385 Norvège–Angleterre = droite.)
 */
function roundSide(stage: string, i: number, total: number): "L" | "R" | null {
  if (stage === "LAST_16") return last16Side(i);
  if (stage === "QUARTER_FINALS" || stage === "SEMI_FINALS") return i < total / 2 ? "L" : "R";
  return null; // FINAL : au centre
}

/** Moitié du tableau pour chaque équipe arrivée en 8es (finalistes = côtés opposés). */
export function teamHalves(matches: Match[]): Map<number, "L" | "R"> {
  const out = new Map<number, "L" | "R">();
  const l16 = matches
    .filter((m) => m.stage === "LAST_16")
    .sort((a, b) => a.id - b.id);
  l16.forEach((m, i) => {
    const side = last16Side(i);
    if (m.homeTeam.id != null) out.set(m.homeTeam.id, side);
    if (m.awayTeam.id != null) out.set(m.awayTeam.id, side);
  });
  return out;
}

/**
 * Validation côté action : verrou + champion/finaliste choisissables + finale
 * cohérente (deux équipes distinctes, de moitiés opposées).
 */
export function championPickValidity(
  matches: Match[],
  championId: number,
  finalistId: number,
): { locked: boolean; championOk: boolean; finalistOk: boolean; coherent: boolean } {
  const lock = lockTime(matches);
  const locked = lock != null && Date.now() >= lock;
  const elim = eliminatedTeamIds(matches);
  const eightsIds = new Set<number>();
  for (const m of matches) {
    if (!reachedEights(m)) continue;
    if (m.homeTeam.id != null) eightsIds.add(m.homeTeam.id);
    if (m.awayTeam.id != null) eightsIds.add(m.awayTeam.id);
  }
  const halves = teamHalves(matches);
  const championOk = eightsIds.has(championId) && !elim.has(championId);
  const finalistOk = eightsIds.has(finalistId) && !elim.has(finalistId);
  const coherent =
    championId !== finalistId &&
    halves.get(championId) != null &&
    halves.get(finalistId) != null &&
    halves.get(championId) !== halves.get(finalistId);
  return { locked, championOk, finalistOk, coherent };
}

async function loadAll() {
  const admin = createAdminClient();
  const [{ data: picks }, { data: profiles }, matches] = await Promise.all([
    // select("*") : tolère l'absence de la colonne finalist_id avant migration.
    championTable(admin).select("*"),
    admin.from("profiles").select("id, username"),
    getResilientMatches().catch(() => [] as Match[]),
  ]);
  const rows = ((picks ?? []) as Partial<PickRow>[]).map((p) => ({
    user_id: p.user_id as string,
    team_id: p.team_id as number,
    finalist_id: p.finalist_id ?? null,
    champ_goals: p.champ_goals as number,
    opp_goals: p.opp_goals as number,
  }));
  return {
    picks: rows as PickRow[],
    profiles: (profiles ?? []) as { id: string; username: string }[],
    matches,
  };
}

/** Bonus Champion pour le classement (finaliste/champion/score exact, une fois la finale jouée). */
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
  half: "L" | "R" | null; // moitié du tableau (pour composer une finale cohérente)
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
  side: "L" | "R" | null; // moitié du tableau (null = finale, au centre)
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
  myPick: {
    team: ChampionTeam; // champion prédit
    finalist: ChampionTeam | null; // finaliste (vice-champion) prédit
    champGoals: number;
    oppGoals: number;
  } | null;
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
  const halves = teamHalves(matches);
  const teamOf = (id: number): ChampionTeam => {
    const d = displayTeam(id, teamName.get(id) ?? null);
    return { id, fr: d.nameFr, flag: d.flag, half: halves.get(id) ?? null };
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
    // Tri par id = ordre officiel du bracket ; side = moitié entrelacée.
    matches: matches
      .filter((m) => m.stage === key)
      .sort((a, b) => a.id - b.id)
      .map((m, i, arr) => ({
        home: teamFromMt(m.homeTeam),
        away: teamFromMt(m.awayTeam),
        winnerId: winnerOf(m),
        side: roundSide(key, i, arr.length),
      })),
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
    ? {
        team: teamOf(my.team_id),
        finalist: my.finalist_id != null ? teamOf(my.finalist_id) : null,
        champGoals: my.champ_goals,
        oppGoals: my.opp_goals,
      }
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
