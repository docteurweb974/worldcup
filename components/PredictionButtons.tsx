"use client";

import type { Outcome } from "@/lib/api";

/** Trois boutons de pronostic : victoire domicile / nul / victoire extérieur. */
export function PredictionButtons({
  homeName,
  awayName,
  value,
  onChange,
}: {
  homeName: string;
  awayName: string;
  value: Outcome | undefined;
  onChange: (choice: Outcome) => void;
}) {
  const options: { key: Outcome; label: string }[] = [
    { key: "home", label: `Victoire ${homeName}` },
    { key: "draw", label: "Match nul" },
    { key: "away", label: `Victoire ${awayName}` },
  ];

  return (
    <div role="radiogroup" aria-label="Votre pronostic" className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const selected = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.key)}
            className={`min-h-tap rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              selected
                ? "border-accent bg-accent-soft text-accent"
                : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
