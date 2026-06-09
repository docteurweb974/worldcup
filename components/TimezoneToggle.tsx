"use client";

import { usePreferences } from "./PreferencesProvider";
import { TIMEZONE_LABELS, type TimezoneChoice } from "@/lib/timezone";

const CHOICES: TimezoneChoice[] = ["france", "pei"];

export function TimezoneToggle() {
  const { timezone, setTimezone } = usePreferences();
  return (
    <div
      role="radiogroup"
      aria-label="Fuseau horaire d'affichage"
      className="flex items-center rounded-full bg-neutral-200 p-1 text-sm font-medium dark:bg-neutral-800"
    >
      {CHOICES.map((tz) => {
        const selected = timezone === tz;
        return (
          <button
            key={tz}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTimezone(tz)}
            className={`min-h-tap rounded-full px-3 transition-colors ${
              selected
                ? "bg-white text-neutral-900 shadow dark:bg-neutral-950 dark:text-white"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            {TIMEZONE_LABELS[tz]}
          </button>
        );
      })}
    </div>
  );
}
