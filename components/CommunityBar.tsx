import { POINTS } from "@/lib/predictions";
import type { CommunityStats, CommunityPrediction } from "@/lib/community";

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

      {stats.predictions.length > 0 && (
        <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-500">
            Le détail par joueur
            {stats.predictions.some((p) => p.isFinal) && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
                🏆 Finale ×2
              </span>
            )}
          </p>
          <ul className="space-y-1.5">
            {stats.predictions.map((p, i) => (
              <PlayerRow key={`${p.username}-${i}`} p={p} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Ligne d'un pronostic joueur (visible seulement une fois le match terminé). */
function PlayerRow({ p }: { p: CommunityPrediction }) {
  const tone =
    p.base === POINTS.exact
      ? "text-green-600 dark:text-green-400"
      : p.base === POINTS.outcome
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium">{p.username}</span>
      <span className="shrink-0 tabular-nums text-neutral-500">{p.pred}</span>
      {p.boosted && (
        <span className="shrink-0 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          ⚡ ×2
        </span>
      )}
      {p.qualifier && (
        <span
          title={`Qualifié : ${p.qualifier.fr}`}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            p.qualifier.correct
              ? "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
              : "bg-neutral-100 text-neutral-500 line-through dark:bg-neutral-800"
          }`}
        >
          {p.qualifier.flag}
          {p.qualifier.correct && " ✓"}
        </span>
      )}
      <span className={`w-9 shrink-0 text-right font-bold tabular-nums ${tone}`}>+{p.pts}</span>
    </li>
  );
}
