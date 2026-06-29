import { isFinished, type Match, type Outcome } from "./api";

/** Équipe désignée comme qualifiée (tie-break sur un nul en phase finale). */
export type Qualifier = "home" | "away";

/** Score pronostiqué pour un match. */
export interface ScorePrediction {
  home: number;
  away: number;
  // Phase finale (8es+) : sur un prono nul, équipe que le joueur voit se qualifier.
  qualifier?: Qualifier | null;
}

/** Barème de points. */
export const POINTS = {
  exact: 5, // score exact
  outcome: 2, // bon résultat (vainqueur / nul) mais score inexact
  wrong: 0, // mauvais résultat
  qualifier: 2, // bonus : bon qualifié sur un nul à 90' (8es+)
} as const;

/** Tours où l'option « choisir le qualifié » s'applique : à partir des 8es. */
const QUALIFIER_STAGES = new Set([
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
]);

/** Le tie-break « qualifié » est-il proposé sur ce tour ? (8es et au-delà) */
export function hasQualifierOption(stage: string): boolean {
  return QUALIFIER_STAGES.has(stage);
}

/**
 * Bonus « qualifié » (+2) : sur un match à élimination (8es+) terminé sur un nul
 * à 90', si le joueur a désigné l'équipe qui s'est réellement qualifiée
 * (prolongation / tirs au but compris). 0 sinon.
 */
export function qualifierBonus(pred: ScorePrediction, match: Match): number {
  if (!pred.qualifier || !hasQualifierOption(match.stage) || !isFinished(match.status)) return 0;
  const reg = match.score.regularTime;
  const home = reg?.home ?? match.score.fullTime.home;
  const away = reg?.away ?? match.score.fullTime.away;
  if (home == null || away == null || home !== away) return 0; // pas un nul à 90'
  const advanced =
    match.score.winner === "HOME_TEAM"
      ? "home"
      : match.score.winner === "AWAY_TEAM"
        ? "away"
        : null;
  return advanced && advanced === pred.qualifier ? POINTS.qualifier : 0;
}

/** Issue (home/draw/away) déduite d'un score. */
export function outcomeOfScore(home: number, away: number): Outcome {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

/** Vrai si l'objet stocké est bien un score (filtre l'ancien format de pronostic). */
export function isValidPrediction(p: unknown): p is ScorePrediction {
  return (
    typeof p === "object" &&
    p !== null &&
    typeof (p as ScorePrediction).home === "number" &&
    typeof (p as ScorePrediction).away === "number"
  );
}

/**
 * Points d'un pronostic pour un match donné.
 * Retourne null si le match n'est pas évaluable (pas terminé ou sans score).
 *
 * Phases finales : on score sur le **temps réglementaire (90')**, hors
 * prolongation et tirs au but. football-data expose ce score via
 * `score.regularTime` quand il y a eu prolongation/TAB ; sinon `fullTime` EST
 * déjà le score à 90'. Le résultat (vainqueur/nul) découle donc du score à 90'
 * (un match départagé en prolongation/TAB compte comme un nul à 90').
 */
export function predictionPoints(pred: ScorePrediction, match: Match): number | null {
  if (!isFinished(match.status)) return null;
  const reg = match.score.regularTime;
  const home = reg?.home ?? match.score.fullTime.home;
  const away = reg?.away ?? match.score.fullTime.away;
  if (home == null || away == null) return null;

  if (pred.home === home && pred.away === away) return POINTS.exact;

  if (outcomeOfScore(pred.home, pred.away) === outcomeOfScore(home, away)) return POINTS.outcome;

  return POINTS.wrong;
}
