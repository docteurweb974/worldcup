import { isFinished, outcomeFromWinner, type Match, type Outcome } from "./api";

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
 */
export function predictionPoints(pred: ScorePrediction, match: Match): number | null {
  if (!isFinished(match.status)) return null;
  const { home, away } = match.score.fullTime;
  if (home == null || away == null) return null;

  if (pred.home === home && pred.away === away) return POINTS.exact;

  const actual = outcomeFromWinner(match.score.winner) ?? outcomeOfScore(home, away);
  if (outcomeOfScore(pred.home, pred.away) === actual) return POINTS.outcome;

  return POINTS.wrong;
}
