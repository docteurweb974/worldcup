import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResilientMatches } from "@/lib/results";
import { isFinished, type Match } from "@/lib/api";
import { displayTeam } from "@/data/teams";

// Tours du Survivor, dans l'ordre (poules J1-J3 puis phases finales, sans 3e place).
export const SURVIVOR_ROUNDS = [
  "J1",
  "J2",
  "J3",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "FINAL",
] as const;
type RoundKey = (typeof SURVIVOR_ROUNDS)[number];

const ROUND_LABELS: Record<string, string> = {
  J1: "Journée 1",
  J2: "Journée 2",
  J3: "Journée 3",
  LAST_32: "16es de finale",
  LAST_16: "8es de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  FINAL: "Finale",
};

export function roundKeyOf(m: Match): string {
  return m.stage === "GROUP_STAGE" ? `J${m.matchday ?? 0}` : m.stage;
}
export const roundLabel = (key: string) => ROUND_LABELS[key] ?? key;
const isSurvivorRound = (key: string): key is RoundKey =>
  (SURVIVOR_ROUNDS as readonly string[]).includes(key);

const scored = (m: Match) => isFinished(m.status) && m.score.fullTime.home != null;
function teamWon(m: Match, teamId: number): boolean {
  if (m.score.winner === "HOME_TEAM") return m.homeTeam.id === teamId;
  if (m.score.winner === "AWAY_TEAM") return m.awayTeam.id === teamId;
  return false; // nul ou indéterminé
}

interface Pick {
  round_key: string;
  match_id: number;
  team_id: number;
}
interface PlayerStatus {
  alive: boolean;
  eliminatedRound: string | null; // tour de l'élimination
  currentRound: string | null; // tour en attente (pas encore résolu)
}

/** Évalue le statut d'un joueur tour par tour. */
function evaluate(
  picks: Map<string, Pick>,
  matchById: Map<number, Match>,
  roundClosed: (k: string) => boolean,
): PlayerStatus {
  for (const rk of SURVIVOR_ROUNDS) {
    const pick = picks.get(rk);
    if (pick) {
      const m = matchById.get(pick.match_id);
      if (m && scored(m)) {
        if (teamWon(m, pick.team_id)) continue; // survit, tour suivant
        return { alive: false, eliminatedRound: rk, currentRound: null };
      }
      return { alive: true, eliminatedRound: null, currentRound: rk }; // choix en attente
    }
    // pas de choix sur ce tour
    if (roundClosed(rk)) return { alive: false, eliminatedRound: rk, currentRound: null };
    return { alive: true, eliminatedRound: null, currentRound: rk }; // tour courant à jouer
  }
  return { alive: true, eliminatedRound: null, currentRound: null }; // a tout survécu
}

export interface SurvivorRoundView {
  key: string;
  label: string;
  state: "won" | "lost" | "missed" | "current" | "locked";
  teamFlag?: string;
  teamFr?: string;
  result?: string;
}
export interface SurvivorPlayer {
  username: string;
  alive: boolean;
  eliminatedLabel: string | null;
}
export interface PickMatch {
  matchId: number;
  home: { id: number; fr: string; flag: string };
  away: { id: number; fr: string; flag: string };
}
export interface SurvivorData {
  rounds: SurvivorRoundView[];
  players: SurvivorPlayer[];
  aliveCount: number;
  totalCount: number;
  eliminated: boolean;
  // Tour en cours du joueur (s'il est en vie) :
  currentRoundLabel: string | null;
  pickMatches: PickMatch[]; // matchs choisissables du tour en cours
  usedTeamIds: number[]; // équipes déjà utilisées par le joueur
  myPickTeamId: number | null; // choix actuel sur le tour en cours
  pickLocked: boolean; // le choix du tour en cours est verrouillé (match commencé)
  winners: string[]; // pseudos des vainqueurs (si jeu décidé)
  iWon: boolean; // le joueur consulté fait partie des vainqueurs
  joinClosed: boolean; // le joueur n'a pas rejoint à la J1 et l'entrée est fermée
  myState: "can-join" | "alive" | "eliminated" | "join-closed";
}

type PickRow = Pick & { user_id: string };
// `survivor_picks` n'est pas dans les types générés → accès typé localement.
export function survivorTable(admin: ReturnType<typeof createAdminClient>) {
  return (
    admin as unknown as {
      from: (t: string) => {
        select: (c: string) => Promise<{ data: PickRow[] | null }>;
        upsert: (rows: PickRow[], opts: { onConflict: string }) => Promise<{ error: unknown }>;
        delete: () => {
          eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
        };
      };
    }
  ).from("survivor_picks");
}

async function loadAll() {
  const admin = createAdminClient();
  const [{ data: picks }, { data: profiles }, matches] = await Promise.all([
    survivorTable(admin).select("user_id, round_key, match_id, team_id"),
    admin.from("profiles").select("id, username"),
    getResilientMatches().catch(() => [] as Match[]),
  ]);
  return {
    picks: (picks ?? []) as PickRow[],
    profiles: (profiles ?? []) as { id: string; username: string }[],
    matches,
  };
}

function buildRoundClosed(matches: Match[]) {
  const meta = new Map<string, { total: number; finished: number }>();
  for (const m of matches) {
    const k = roundKeyOf(m);
    if (!isSurvivorRound(k)) continue;
    const r = meta.get(k) ?? { total: 0, finished: 0 };
    r.total += 1;
    if (scored(m)) r.finished += 1;
    meta.set(k, r);
  }
  return (k: string) => {
    const r = meta.get(k);
    return !!r && r.total > 0 && r.finished >= r.total;
  };
}

function picksByUser(picks: (Pick & { user_id: string })[]) {
  const map = new Map<string, Map<string, Pick>>();
  for (const p of picks) {
    if (!map.has(p.user_id)) map.set(p.user_id, new Map());
    map.get(p.user_id)!.set(p.round_key, p);
  }
  return map;
}

export interface SurvivorOutcome {
  winners: Set<string>; // vainqueur(s) du jeu
  aliveIds: Set<string>; // participants encore en vie (inclut le vainqueur)
  eliminatedRound: Map<string, string>; // id → tour d'élimination (clé de tour)
  decided: boolean; // le jeu a un vainqueur
}

/**
 * Déroule le Survivor tour par tour et détermine le résultat.
 *
 * Règle clé : dès qu'il ne reste qu'UN seul survivant (les autres éliminés), il
 * est déclaré vainqueur — même s'il ne joue pas les tours suivants (inutile). On
 * s'arrête donc à ce moment-là, ce qui évite de l'« éliminer » à tort pour un
 * tour non joué.
 */
export function computeSurvivorOutcome(
  participantIds: string[],
  byUser: Map<string, Map<string, Pick>>,
  matchById: Map<number, Match>,
  roundClosed: (k: string) => boolean,
): SurvivorOutcome {
  const alive = new Set(participantIds);
  const eliminatedRound = new Map<string, string>();
  const multi = participantIds.length > 1;

  for (const rk of SURVIVOR_ROUNDS) {
    // Dernier survivant → jeu décidé, on n'exige plus de choix.
    if (multi && alive.size <= 1) break;
    for (const id of [...alive]) {
      const pick = byUser.get(id)?.get(rk);
      if (pick) {
        const m = matchById.get(pick.match_id);
        if (m && scored(m) && !teamWon(m, pick.team_id)) {
          alive.delete(id);
          eliminatedRound.set(id, rk);
        }
        // gagné ou match pas encore joué → reste en vie
      } else if (roundClosed(rk)) {
        // pas de choix sur un tour clôturé → éliminé
        alive.delete(id);
        eliminatedRound.set(id, rk);
      }
    }
  }

  const finalDone = roundClosed("FINAL");
  let winners = new Set<string>();
  if (multi && alive.size === 1) winners = new Set(alive); // dernier survivant
  else if (finalDone && alive.size >= 1) winners = new Set(alive); // survivants après la finale
  return { winners, aliveIds: alive, eliminatedRound, decided: winners.size > 0 };
}

/** Vainqueur(s) du Survivor : utilisé pour le bonus +10 pts au classement. */
export async function getSurvivorWinners(): Promise<Set<string>> {
  let data;
  try {
    data = await loadAll();
  } catch {
    return new Set();
  }
  const { picks, profiles, matches } = data;
  if (matches.length === 0) return new Set();
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const roundClosed = buildRoundClosed(matches);
  const byUser = picksByUser(picks);
  // Participant = a rejoint le Survivor à la Journée 1.
  const participantIds = profiles.filter((p) => byUser.get(p.id)?.has("J1")).map((p) => p.id);
  if (participantIds.length === 0) return new Set();
  return computeSurvivorOutcome(participantIds, byUser, matchById, roundClosed).winners;
}

/** Toutes les données nécessaires à la page Survivor pour un joueur donné. */
export async function getSurvivorData(viewerId: string): Promise<SurvivorData> {
  const empty: SurvivorData = {
    rounds: [],
    players: [],
    aliveCount: 0,
    totalCount: 0,
    eliminated: false,
    currentRoundLabel: null,
    pickMatches: [],
    usedTeamIds: [],
    myPickTeamId: null,
    pickLocked: false,
    winners: [],
    iWon: false,
    joinClosed: false,
    myState: "can-join",
  };
  let data;
  try {
    data = await loadAll();
  } catch {
    return empty;
  }
  const { picks, profiles, matches } = data;
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const roundClosed = buildRoundClosed(matches);
  const byUser = picksByUser(picks);
  const nameById = new Map(profiles.map((p) => [p.id, p.username]));
  const now = Date.now();

  // Résultat global du jeu (= source de vérité pour vivants/éliminés/vainqueurs).
  const participantIds = profiles.filter((p) => byUser.get(p.id)?.has("J1")).map((p) => p.id);
  const outcome = computeSurvivorOutcome(participantIds, byUser, matchById, roundClosed);

  const players: SurvivorPlayer[] = participantIds
    .map((id) => {
      const alive = outcome.aliveIds.has(id);
      const elimRk = outcome.eliminatedRound.get(id) ?? null;
      return {
        username: nameById.get(id) ?? "Joueur",
        alive,
        eliminatedLabel: elimRk ? roundLabel(elimRk) : null,
      };
    })
    .sort((a, b) => Number(b.alive) - Number(a.alive) || a.username.localeCompare(b.username));
  const aliveCount = players.filter((p) => p.alive).length;

  // Données propres au joueur.
  const myPicks = byUser.get(viewerId) ?? new Map<string, Pick>();
  const iWon = outcome.winners.has(viewerId);
  const myAlive = outcome.aliveIds.has(viewerId);
  // Le tour à jouer n'a de sens que si je suis en vie ET que le jeu n'est pas décidé.
  const evalStatus = evaluate(myPicks, matchById, roundClosed);
  const myStatus = {
    alive: myAlive,
    eliminatedRound: outcome.eliminatedRound.get(viewerId) ?? null,
    currentRound: !outcome.decided && myAlive ? evalStatus.currentRound : null,
  };

  // Parcours du joueur (un nœud par tour).
  let done = false;
  const rounds: SurvivorRoundView[] = SURVIVOR_ROUNDS.map((rk) => {
    const label = roundLabel(rk);
    if (done) return { key: rk, label, state: "locked" as const };
    const pick = myPicks.get(rk);
    const teamInfo = (id: number, m?: Match) => {
      const t = m && (m.homeTeam.id === id ? m.homeTeam : m.awayTeam);
      const d = displayTeam(id, t?.name ?? null);
      return { teamFlag: d.flag, teamFr: d.nameFr };
    };
    if (pick) {
      const m = matchById.get(pick.match_id);
      if (m && scored(m)) {
        const won = teamWon(m, pick.team_id);
        const res = `${m.score.fullTime.home}-${m.score.fullTime.away}`;
        if (won) return { key: rk, label, state: "won", ...teamInfo(pick.team_id, m), result: res };
        done = true;
        return { key: rk, label, state: "lost", ...teamInfo(pick.team_id, m), result: res };
      }
      // choix posé, match pas encore joué → tour courant (verrouillé si match commencé)
      done = true;
      return { key: rk, label, state: "current", ...teamInfo(pick.team_id, m) };
    }
    if (roundClosed(rk)) {
      done = true;
      // Vainqueur (dernier survivant) : il n'avait pas besoin de jouer ce tour.
      return { key: rk, label, state: iWon ? "locked" : "missed" };
    }
    done = true;
    return { key: rk, label, state: "current" };
  });

  // Tour en cours : matchs choisissables + verrou + choix actuel.
  const currentRoundKey = myStatus.currentRound;
  let pickMatches: PickMatch[] = [];
  let pickLocked = false;
  let myPickTeamId: number | null = null;
  if (myStatus.alive && currentRoundKey) {
    const currentPick = myPicks.get(currentRoundKey);
    myPickTeamId = currentPick?.team_id ?? null;
    const pickMatch = currentPick ? matchById.get(currentPick.match_id) : undefined;
    pickLocked = !!pickMatch && new Date(pickMatch.utcDate).getTime() <= now;
    pickMatches = matches
      .filter((m) => roundKeyOf(m) === currentRoundKey)
      .filter((m) => m.homeTeam.id != null && m.awayTeam.id != null)
      .filter((m) => new Date(m.utcDate).getTime() > now) // pas encore commencé
      .sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate))
      .map((m) => {
        const h = displayTeam(m.homeTeam.id, m.homeTeam.name);
        const a = displayTeam(m.awayTeam.id, m.awayTeam.name);
        return {
          matchId: m.id,
          home: { id: m.homeTeam.id as number, fr: h.nameFr, flag: h.flag },
          away: { id: m.awayTeam.id as number, fr: a.nameFr, flag: a.flag },
        };
      });
  }

  const usedTeamIds = [...myPicks.values()]
    .filter((p) => p.round_key !== currentRoundKey)
    .map((p) => p.team_id);

  const winners = [...outcome.winners].map((id) => nameById.get(id) ?? "Joueur");

  return {
    rounds,
    players,
    aliveCount,
    totalCount: players.length,
    eliminated: !myStatus.alive && myPicks.has("J1"),
    currentRoundLabel: currentRoundKey ? roundLabel(currentRoundKey) : null,
    pickMatches,
    usedTeamIds,
    myPickTeamId,
    pickLocked,
    winners,
    iWon,
    joinClosed: !myPicks.has("J1") && roundClosed("J1"),
    myState: !myPicks.has("J1")
      ? roundClosed("J1")
        ? "join-closed"
        : "can-join"
      : myStatus.alive
        ? "alive"
        : "eliminated",
  };
}
