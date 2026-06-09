"use client";

import { usePreferences } from "./PreferencesProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = usePreferences();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Passer en mode jour" : "Passer en mode nuit"}
      title={isDark ? "Mode jour" : "Mode nuit"}
      className="grid h-tap w-tap place-items-center rounded-full text-xl transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}
