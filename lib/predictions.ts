import { isFinished, type Match, type Outcome } from "./api";

/** Score pronostiqué pour un match. */
export interface ScorePrediction {
  home: number;
  away: number;
}

/** Barème de points. */
export const POINTS = {
  exact: 5, // score exact
  outcome: 2, // bon résultat (vainqueur / nul) mais score inexact
  wrong: 0, // mauvais résultat
} as const;

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
