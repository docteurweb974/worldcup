import { POINTS } from "@/lib/predictions";

/** Rappel du barème de points, affiché en haut de Mes pronos. */
export function BaremeCard() {
  const rows = [
    { emoji: "🎯", label: "Score exact", pts: POINTS.exact, cls: "text-accent" },
    { emoji: "✅", label: "Bon résultat", pts: POINTS.outcome, cls: "" },
    { emoji: "❌", label: "Mauvais résultat", pts: POINTS.wrong, cls: "text-neutral-500" },
  ];
  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-2 font-bold">Barème des points</h2>
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2">
            <span>
              {r.emoji} {r.label}
            </span>
            <span className={`font-semibold tabular-nums ${r.cls}`}>
              {r.pts} pt{r.pts > 1 ? "s" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
