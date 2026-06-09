"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { TimezoneChoice } from "@/lib/timezone";

type Theme = "light" | "dark";

interface PreferencesContextValue {
  theme: Theme;
  toggleTheme: () => void;
  timezone: TimezoneChoice;
  setTimezone: (tz: TimezoneChoice) => void;
  favorites: string[]; // TLAs, ex. ["FRA", "BRA"]
  isFavorite: (tla: string) => boolean;
  toggleFavorite: (tla: string) => void;
  hydrated: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // `theme` stocké à null tant que l'utilisateur n'a pas choisi explicitement :
  // on respecte alors la décision du script anti-flash (prefers-color-scheme).
  const [storedTheme, setStoredTheme, themeHydrated] = useLocalStorage<Theme | null>(
    "theme",
    null,
  );
  const [timezone, setTimezone, tzHydrated] = useLocalStorage<TimezoneChoice>(
    "timezone",
    "france",
  );
  const [favorites, setFavorites, favHydrated] = useLocalStorage<string[]>(
    "favoriteTeams",
    [],
  );

  const [theme, setTheme] = useState<Theme>("light");
  const [initialized, setInitialized] = useState(false);

  // Initialise le thème depuis le stockage, sinon depuis la classe déjà posée
  // sur <html> par le script anti-flash. Aucune écriture localStorage ici.
  useEffect(() => {
    if (!themeHydrated) return;
    const domDark = document.documentElement.classList.contains("dark");
    setTheme(storedTheme ?? (domDark ? "dark" : "light"));
    setInitialized(true);
  }, [themeHydrated, storedTheme]);

  // Applique la classe `dark` uniquement après initialisation (évite tout flash).
  useEffect(() => {
    if (!initialized) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, initialized]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      setStoredTheme(next);
      return next;
    });
  }, [setStoredTheme]);

  const isFavorite = useCallback((tla: string) => favorites.includes(tla), [favorites]);

  const toggleFavorite = useCallback(
    (tla: string) =>
      setFavorites((prev) =>
        prev.includes(tla) ? prev.filter((t) => t !== tla) : [...prev, tla],
      ),
    [setFavorites],
  );

  const value: PreferencesContextValue = {
    theme,
    toggleTheme,
    timezone,
    setTimezone,
    favorites,
    isFavorite,
    toggleFavorite,
    hydrated: themeHydrated && tzHydrated && favHydrated,
  };

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences doit être utilisé dans <PreferencesProvider>.");
  }
  return ctx;
}
