/** Jauge circulaire (anneau de progression) avec valeur au centre + libellé + %. */
export function CircularGauge({
  value,
  pct,
  label,
}: {
  value: number;
  pct: number;
  label: string;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - clamped / 100);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-neutral-200 dark:stroke-neutral-800" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="stroke-accent transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-2xl font-bold tabular-nums">
          {value}
        </span>
      </div>
      <span className="text-center text-xs text-neutral-500">{label}</span>
      <span className="text-xs font-semibold text-accent tabular-nums">{Math.round(clamped)}%</span>
    </div>
  );
}
