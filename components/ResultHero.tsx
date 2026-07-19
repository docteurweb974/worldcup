import { POINTS } from "@/lib/predictions";
import { StadiumHero, FlagCircle } from "./StadiumHero";

const ROUND_LABELS: Record<string, string> = {
  GROUP_STAGE: "Phase de groupes",
  LAST_32: "16es de finale",
  LAST_16: "8es de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  THIRD_PLACE: "Petite finale",
  FINAL: "Finale",
};
export function stageLabel(stage: string, group: string | null): string {
  if (stage === "GROUP_STAGE") {
    const letter = group?.replace(/^group[_ ]?/i, "").trim();
    return letter ? `Phase de groupes · Groupe ${letter}` : "Phase de groupes";
  }
  return ROUND_LABELS[stage] ?? stage.replaceAll("_", " ");
}

export interface ResultHeroData {
  stadium: string;
  home: { flag: string; nameFr: string; tla: string | null };
  away: { flag: string; nameFr: string; tla: string | null };
  score: { home: number; away: number };
  pens: { home: number; away: number } | null;
  aet: boolean;
  reg: { home: number; away: number } | null;
  stage: string;
  date: string;
  prediction: { home: number; away: number; base: number; points: number } | null;
  isFinal?: boolean; // finale → points comptés double
  backHref?: string;
}

export function ResultHero({
  stadium,
  home,
  away,
  score,
  pens,
  aet,
  reg,
  stage,
  date,
  prediction,
  isFinal = false,
  backHref = "/calendrier",
}: ResultHeroData) {
  const show90 = (aet || pens) && reg != null;

  const predTone = !prediction
    ? ""
    : prediction.base === POINTS.exact
      ? "bg-green-500/25 text-green-100"
      : prediction.base === POINTS.outcome
        ? "bg-amber-500/25 text-amber-100"
        : "bg-red-500/25 text-red-100";
  const predMsg = !prediction
    ? ""
    : prediction.base === POINTS.exact
      ? "Score exact !"
      : prediction.base === POINTS.outcome
        ? "Bon résultat"
        : "Raté";

  return (
    <StadiumHero stadium={stadium} backHref={backHref}>
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest">Résultat du match</p>
        <p className="text-xs text-white/70">{date}</p>
      </div>

      {/* Drapeaux + score */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <FlagCircle tla={home.tla} emoji={home.flag} />
        <div className="text-center">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Terminé
          </span>
          {pens && (
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-200/90">
              Tirs au but
            </p>
          )}
          {aet && !pens && (
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
              Après prolongation
            </p>
          )}
          <div className="mt-0.5 text-4xl font-black leading-none tabular-nums">
            <span>{score.home}</span>
            {pens && (
              <span className="align-super text-base font-bold text-amber-200"> ({pens.home})</span>
            )}
            <span className="mx-1.5 text-2xl font-normal text-white/40">-</span>
            <span>{score.away}</span>
            {pens && (
              <span className="align-super text-base font-bold text-amber-200"> ({pens.away})</span>
            )}
          </div>
          {show90 && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/25 px-3 py-1 text-xs font-bold text-amber-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 13V9" />
                <path d="M9 2h6" />
              </svg>
              90 min : {reg!.home}-{reg!.away}
            </span>
          )}
          <span className="mt-1.5 block text-[10px] uppercase tracking-wide text-white/60">
            {stage}
          </span>
        </div>
        <FlagCircle tla={away.tla} emoji={away.flag} />
      </div>

      {/* Noms */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <span className="flex-1 text-right text-base font-bold uppercase leading-tight">
          {home.nameFr}
        </span>
        <span className="text-xs font-semibold text-white/40">VS</span>
        <span className="flex-1 text-left text-base font-bold uppercase leading-tight">
          {away.nameFr}
        </span>
      </div>

      {/* Mon pronostic intégré */}
      {prediction && (
        <div className="mt-4 rounded-2xl border border-white/15 bg-black/25 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
            Mon pronostic
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-3">
            <span className="text-xl font-black tabular-nums">
              {prediction.home} - {prediction.away}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${predTone}`}>
              +{prediction.points} pt{prediction.points > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-white/70">{predMsg}</p>
          {isFinal && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-violet-300">
              🏆 Finale · points ×2
            </p>
          )}
        </div>
      )}
    </StadiumHero>
  );
}
