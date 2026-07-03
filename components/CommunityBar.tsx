import type { CommunityStats } from "@/lib/community";

/** Répartition des pronostics de la communauté — 3 cartes (domicile / nul / extérieur). */
export function CommunityBar({
  stats,
  homeName,
  awayName,
  homeFlag,
  awayFlag,
}: {
  stats: CommunityStats;
  homeName: string;
  awayName: string;
  homeFlag: string;
  awayFlag: string;
}) {
  if (stats.total === 0) return null;
  const pct = (n: number) => Math.round((100 * n) / stats.total);
  const h = pct(stats.home);
  const d = pct(stats.draw);
  const a = pct(stats.away);
  const max = Math.max(h, d, a);

  const Col = ({
    flag,
    name,
    p,
    bar,
    lead,
  }: {
    flag: string;
    name: string;
    p: number;
    bar: string;
    lead: boolean;
  }) => (
    <div
      className={`rounded-xl border p-3 text-center ${
        lead ? "border-accent bg-accent-soft" : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="text-2xl" aria-hidden="true">{flag}</div>
      <div className="mt-1 truncate text-[11px] font-medium text-neutral-500">{name}</div>
      <div className="text-2xl font-black tabular-nums">{p}%</div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );

  return (
    <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-3 font-bold">Pronos de la communauté</h2>
      <div className="grid grid-cols-3 gap-2">
        <Col flag={homeFlag} name={homeName} p={h} bar="bg-accent" lead={h === max} />
        <Col flag="🤝" name="Match nul" p={d} bar="bg-neutral-400" lead={d === max} />
        <Col flag={awayFlag} name={awayName} p={a} bar="bg-cta" lead={a === max} />
      </div>
      <p className="mt-3 text-center text-xs text-neutral-400">
        {stats.total} pronostic{stats.total > 1 ? "s" : ""}
      </p>
    </section>
  );
}
