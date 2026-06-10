import type { CommunityStats } from "@/lib/community";

/** Répartition des pronostics de la communauté (barre empilée). */
export function CommunityBar({
  stats,
  homeName,
  awayName,
}: {
  stats: CommunityStats;
  homeName: string;
  awayName: string;
}) {
  if (stats.total === 0) return null;
  const pct = (n: number) => Math.round((100 * n) / stats.total);
  const h = pct(stats.home);
  const d = pct(stats.draw);
  const a = pct(stats.away);

  return (
    <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-3 font-bold">Pronos de la communauté 📊</h2>
      <div className="flex h-3 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div className="bg-accent" style={{ width: `${h}%` }} title={`${homeName} ${h}%`} />
        <div className="bg-neutral-400" style={{ width: `${d}%` }} title={`Nul ${d}%`} />
        <div className="bg-cta" style={{ width: `${a}%` }} title={`${awayName} ${a}%`} />
      </div>
      <div className="mt-2 flex justify-between gap-2 text-xs">
        <span className="text-accent">{homeName} {h}%</span>
        <span className="text-neutral-500">Nul {d}%</span>
        <span className="text-cta">{awayName} {a}%</span>
      </div>
      <p className="mt-1 text-center text-xs text-neutral-400">
        {stats.total} pronostic{stats.total > 1 ? "s" : ""}
      </p>
    </section>
  );
}
