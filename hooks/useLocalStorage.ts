"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook localStorage SSR-safe et typé.
 *
 * - Au rendu serveur (et au tout premier rendu client), renvoie `initialValue`
 *   pour éviter tout mismatch d'hydratation, puis lit le stockage dans un effet.
 * - Toutes les lectures/écritures sont protégées par try/catch.
 * - Le 3e élément retourné, `hydrated`, indique que la valeur réelle a été lue
 *   (utile pour afficher un skeleton tant qu'on n'a pas la préférence locale).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): readonly [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  // Lecture initiale, côté client uniquement.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Stockage indisponible ou JSON corrompu : on garde initialValue.
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setStored = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Quota dépassé / mode privé : on met quand même à jour l'état mémoire.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, setStored, hydrated] as const;
}
