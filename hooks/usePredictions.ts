"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { isValidPrediction, type ScorePrediction } from "@/lib/predictions";

export type Predictions = Record<string, ScorePrediction>;

/** Gestion des pronostics (scores), persistés en localStorage sous « predictions ». */
export function usePredictions() {
  const [predictions, setPredictions, hydrated] = useLocalStorage<Predictions>(
    "predictions",
    {},
  );

  const setPrediction = useCallback(
    (matchId: number, score: ScorePrediction) =>
      setPredictions((prev) => ({ ...prev, [matchId]: score })),
    [setPredictions],
  );

  const getPrediction = useCallback(
    (matchId: number): ScorePrediction | undefined => {
      const p = predictions[matchId];
      return isValidPrediction(p) ? p : undefined;
    },
    [predictions],
  );

  return { predictions, setPrediction, getPrediction, hydrated };
}
