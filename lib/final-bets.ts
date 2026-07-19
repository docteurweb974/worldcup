import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResilientMatches } from "@/lib/results";
import { isFinished, type Match } from "@/lib/api";
import { displayTeam } from "@/data/teams";

// Paris bonus de la FINALE : 4 paris à +3 pts chacun (max +12), en plus du
// pronostic de score (lui-même doublé sur la finale). Fenêtre : jusqu'au coup
// d'envoi. Jugés sur le score à la mi-temps et à 90' (hors prolongation/TAB).
export const FINAL_BET_POINTS = 3;

export type Half = "first" | "equal" | "second";
export type OverUnder = "over" | "under";
export type Btts = "yes" | "no";
export type HtResult = "home" | "draw" | "away";

export interface FinalBets {
  half: Half | null;
  overUnder: OverUnder | null;
  btts: Btts | null;
  htResult: HtResult | null;
}

interface BetRow {
  user_id: string;
  half: string | null;
  over_under: string | null;
  btts: string | null;
  ht_result: string | null;
}

// `final_bets` hors types générés → accès typé localement.
export function finalBetsTable(admin: ReturnType<typeof createAdminClient>) {
  return (
    admin as unknown as {
      from: (t: string) => {
        select: (c: string) => Promise<{ data: BetRow[] | null }>;
        upsert: (
          rows: Record<string, unknown>[],
          o: { onConflict: string },
        ) => Promise<{ error: unknown }>;
      };
    }
  ).from("final_bets");
}

const asHalf = (v: unknown): Half | null =>
  v === "first" || v === "equal" || v === "second" ? v : null;
const asOU = (v: unknown): OverUnder | null => (v === "over" || v === "under" ? v : null);
const asBtts = (v: unknown): Btts | null => (v === "yes" || v === "no" ? v : null);
const asHt = (v: unknown): HtResult | null =>
  v === "home" || v === "draw" || v === "away" ? v : null;

function rowToBets(r: BetRow): FinalBets {
  return {
    half: asHalf(r.half),
    overUnder: asOU(r.over_under),
    btts: asBtts(r.btts),
    htResult: asHt(r.ht_result),
  };
}

/** Score à 90' (hors prolongation/TAB). */
function ninety(m: Match): { home: number; away: number } | null {
  const reg = m.score.regularTime;
  const home = reg?.home ?? m.score.fullTime.home;
  const away = reg?.away ?? m.score.fullTime.away;
  return home == null || away == null ? null : { home, away };
}

/** Issues réelles des 4 paris (null si le match n'est pas exploitable). */
export function finalOutcomes(m: Match): FinalBets | null {
  if (!isFinished(m.status)) return null;
  const ht = m.score.halfTime;
  const reg = ninety(m);
  if (ht.home == null || ht.away == null || !reg) return null;
  const first = ht.home + ht.away;
  const total = reg.home + reg.away;
  const second = total - first;
  return {
    half: first > second ? "first" : second > first ? "second" : "equal",
    overUnder: total > 2.5 ? "over" : "under",
    btts: reg.home > 0 && reg.away > 0 ? "yes" : "no",
    htResult: ht.home > ht.away ? "home" : ht.home < ht.away ? "away" : "draw",
  };
}

/** +3 par pari correct. */
function pointsForBets(bets: FinalBets, out: FinalBets | null): number {
  if (!out) return 0;
  let p = 0;
  if (bets.half && bets.half === out.half) p += FINAL_BET_POINTS;
  if (bets.overUnder && bets.overUnder === out.overUnder) p += FINAL_BET_POINTS;
  if (bets.btts && bets.btts === out.btts) p += FINAL_BET_POINTS;
  if (bets.htResult && bets.htResult === out.htResult) p += FINAL_BET_POINTS;
  return p;
}

/** Match de la finale (ou null si pas encore programmé). */
export async function getFinalMatch(): Promise<Match | null> {
  const matches = await getResilientMatches().catch(() => [] as Match[]);
  return matches.find((m) => m.stage === "FINAL") ?? null;
}

/** Bonus « paris finale » pour le classement (une fois la finale jouée). */
export async function getFinalBetsBonuses(): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  try {
    const match = await getFinalMatch();
    if (!match) return out;
    const outcomes = finalOutcomes(match);
    if (!outcomes) return out;
    const { data } = await finalBetsTable(createAdminClient()).select("*");
    for (const r of data ?? []) {
      const pts = pointsForBets(rowToBets(r), outcomes);
      if (pts > 0) out.set(r.user_id, pts);
    }
  } catch {
    /* table absente / clé manquante : pas de bonus */
  }
  return out;
}

export interface FinalBetsData {
  available: boolean; // une finale existe et a ses 2 équipes
  matchId: number | null;
  home: { flag: string; fr: string } | null;
  away: { flag: string; fr: string } | null;
  kickoffIso: string | null;
  locked: boolean; // coup d'envoi passé (plus de saisie)
  finished: boolean;
  myBets: FinalBets;
  outcomes: FinalBets | null; // issues réelles (si terminé)
  myPoints: number | null; // points gagnés (si terminé)
}

const EMPTY_BETS: FinalBets = { half: null, overUnder: null, btts: null, htResult: null };

/** Données de la section « Paris bonus de la finale » pour un joueur. */
export async function getFinalBetsData(viewerId: string | null): Promise<FinalBetsData> {
  const base: FinalBetsData = {
    available: false,
    matchId: null,
    home: null,
    away: null,
    kickoffIso: null,
    locked: false,
    finished: false,
    myBets: EMPTY_BETS,
    outcomes: null,
    myPoints: null,
  };
  const match = await getFinalMatch();
  if (!match || match.homeTeam.id == null || match.awayTeam.id == null) return base;

  const home = displayTeam(match.homeTeam.id, match.homeTeam.name);
  const away = displayTeam(match.awayTeam.id, match.awayTeam.name);
  const finished = isFinished(match.status);
  const locked = new Date(match.utcDate).getTime() <= Date.now();
  const outcomes = finished ? finalOutcomes(match) : null;

  let myBets = EMPTY_BETS;
  let myPoints: number | null = null;
  if (viewerId) {
    try {
      const { data } = await finalBetsTable(createAdminClient()).select("*");
      const mine = (data ?? []).find((r) => r.user_id === viewerId);
      if (mine) {
        myBets = rowToBets(mine);
        if (outcomes) myPoints = pointsForBets(myBets, outcomes);
      }
    } catch {
      /* table absente : formulaire indisponible mais page ok */
    }
  }

  return {
    available: true,
    matchId: match.id,
    home: { flag: home.flag, fr: home.nameFr },
    away: { flag: away.flag, fr: away.nameFr },
    kickoffIso: match.utcDate,
    locked,
    finished,
    myBets,
    outcomes,
    myPoints,
  };
}

/** Validation + persistance d'une grille (appelée par la server action). */
export async function persistFinalBets(userId: string, bets: FinalBets): Promise<boolean> {
  const match = await getFinalMatch();
  if (!match) return false;
  if (new Date(match.utcDate).getTime() <= Date.now()) return false; // verrouillé

  const { error } = await finalBetsTable(createAdminClient()).upsert(
    [
      {
        user_id: userId,
        half: asHalf(bets.half),
        over_under: asOU(bets.overUnder),
        btts: asBtts(bets.btts),
        ht_result: asHt(bets.htResult),
      },
    ],
    { onConflict: "user_id" },
  );
  return !error;
}
