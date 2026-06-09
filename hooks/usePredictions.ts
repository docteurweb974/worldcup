"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { Outcome } from "@/lib/api";

export type Predictions = Record<string, Outcome>;

/** Gestion des pronostics, persistés en localStorage sous « predictions ». */
export function usePredictions() {
  const [predictions, setPredictions, hydrated] = useLocalStorage<Predictions>(
    "predictions",
    {},
  );

  const setPrediction = useCallback(
    (matchId: number, choice: Outcome) =>
      setPredictions((prev) => ({ ...prev, [matchId]: choice })),
    [setPredictions],
  );

  const getPrediction = useCallback(
    (matchId: number): Outcome | undefined => predictions[matchId],
    [predictions],
  );

  return { predictions, setPrediction, getPrediction, hydrated };
}
