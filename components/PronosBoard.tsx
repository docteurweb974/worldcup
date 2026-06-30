"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { InlineMatchCard } from "./InlineMatchCard";
import { CountUp } from "./CountUp";
import { BaremeCard } from "./BaremeCard";
import { savePrediction, setBoost, clearBoost } from "@/app/predictions/actions";
import { formatFull } from "@/lib/timezone";
import { displayTeam } from "@/data/teams";
import { isFinished, matchScore, scoreSuffix, type Match } from "@/lib/api";
import { POINTS, predictionPoints, qualifierBonus, type ScorePrediction } from "@/lib/predictions";

export interface DbPrediction extends ScorePrediction {
  matchId: number;
}

const canPredict = (m: Match) => m.status === "SCHEDULED" || m.status === "TIMED";
const byDate = (a: Match, b: Match) => +new Date(a.utcDate) - +new Date(b.utcDate);

const ROUND_LABELS: Record<string, string> = {
  LAST_32: "16es de finale",
  LAST_16: "8es de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  THIRD_PLACE: "Petite finale",
  FINAL: "Finale",
};

/** Regroupe un match par « tour » : Journée X (poules) ou nom de la phase finale. */
function roundOf(m: Match): { key: string; label: string } {
  if (m.stage === "GROUP_STAGE") {
    const j = m.matchday ?? 0;
    return { key: `J${j}`, label: `Journée ${j}` };
  }
  return {
    key: m.stage,
    label: ROUND_LABELS[m.stage] ?? m.stage.replaceAll("_", " ").toLowerCase(),
  };
}

export function PronosBoard({
  matches,
  initialPredictions,
  initialBoosts = {},
}: {
  matches: Match[];
  initialPredictions: DbPrediction[];
  initialBoosts?: Record<string, number>;
}) {
  const { timezone } = usePreferences();
  const [preds, setPreds] = useState<Map<number, ScorePrediction>>(
    () =>
      new Map(
        initialPredictions.map((p) => [
          p.matchId,
          { home: p.home, away: p.away, qualifier: p.qualifier ?? null },
        ]),
      ),
  );
  const [openRound, setOpenRound] = useState<string | null>(null); // tout fermé par défaut
  const [hideFinished, setHideFinished] = useState(false);
  // Boost : 1 par journée de poules (clé de tour → id du match boosté).
  const [boosts, setBoosts] = useState<Map<string, number>>(
    () => new Map(Object.entries(initialBoosts).map(([k, v]) => [k, Number(v)])),
  );
  const boostedIds = useMemo(() => new Set(boosts.values()), [boosts]);

  const handleSave = async (matchId: number, score: ScorePrediction) => {
    const res = await savePrediction(matchId, score.home, score.away, score.qualifier ?? null);
    if (!res?.error) setPreds((prev) => new Map(prev).set(matchId, score));
    return res;
  };

  const toggleBoost = async (roundKey: string, matchId: number) => {
    const prev = boosts;
    const isCurrent = prev.get(roundKey) === matchId;
    const next = new Map(prev);
    if (isCurrent) next.delete(roundKey);
    else next.set(roundKey, matchId);
    setBoosts(next); // optimiste
    const res = isCurrent ? await clearBoost(roundKey) : await setBoost(matchId);
    if (res?.error) setBoosts(prev); // échec → on revient en arrière
  };

  // Progression : sur les seuls matchs encore pronostiquables.
  const predictable = useMemo(() => matches.filter(canPredict), [matches]);
  const predictableDone = predictable.filter((m) => preds.has(m.id)).length;
  const pct =
    predictable.length > 0 ? Math.round((100 * predictableDone) / predictable.length) : 100;

  // Toutes les journées/tours, avec TOUS leurs matchs (terminés inclus).
  const rounds = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, { key: string; label: string; matches: Match[] }>();
    for (const m of [...matches].sort(byDate)) {
      const { key, label } = roundOf(m);
      let r = map.get(key);
      if (!r) {
        r = { key, label, matches: [] };
        map.set(key, r);
        order.push(key);
      }
      r.matches.push(m);
    }
    return order.map((k) => {
      const r = map.get(k)!;
      return { ...r, predicted: r.matches.filter((m) => preds.has(m.id)).length };
    });
  }, [matches, preds]);

  // Bouton « Masquer les matchs terminés » : retire les matchs finis, et masque
  // toute journée qui n'aurait plus que des matchs terminés.
  const visibleRounds = rounds
    .map((r) => ({
      ...r,
      shown: hideFinished ? r.matches.filter((m) => !isFinished(m.status)) : r.matches,
    }))
    .filter((r) => r.shown.length > 0);

  // Bilan des matchs terminés que tu as pronostiqués.
  const evaluated = useMemo(() => {
    return matches
      .filter((m) => isFinished(m.status) && preds.has(m.id))
      .map((m) => {
        const pred = preds.get(m.id)!;
        const base = predictionPoints(pred, m) ?? 0;
        const bonus = qualifierBonus(pred, m);
        const boosted = boostedIds.has(m.id);
        return { m, base, bonus, boosted, pts: (boosted ? base * 2 : base) + bonus };
      })
      .sort((a, b) => +new Date(b.m.utcDate) - +new Date(a.m.utcDate));
  }, [matches, preds, boostedIds]);

  const total = evaluated.reduce((s, x) => s + x.pts, 0);
  const exact = evaluated.filter((x) => x.base === POINTS.exact).length;
  const good = evaluated.filter((x) => x.base === POINTS.outcome).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-xl font-bold">Mes pronos 🎯</h1>

      <BaremeCard />

      {evaluated.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
          <p className="text-sm text-neutral-500">Total de points</p>
          <CountUp value={total} className="block text-5xl font-bold text-accent" />
          <div className="mt-3 flex justify-center gap-4 text-sm text-neutral-500">
            <span>🎯 {exact} exact{exact > 1 ? "s" : ""}</span>
            <span>✅ {good} bon{good > 1 ? "s" : ""}</span>
            <span>❌ {evaluated.length - exact - good} raté{evaluated.length - exact - good > 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {rounds.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">Mes matchs</h2>
            {matches.some((m) => isFinished(m.status)) && (
              <button
                type="button"
                aria-pressed={hideFinished}
                onClick={() => setHideFinished((v) => !v)}
                className={`min-h-tap rounded-full border px-4 text-sm font-medium transition-colors ${
                  hideFinished
                    ? "border-cta bg-cta text-cta-fg"
                    : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
                }`}
              >
                {hideFinished ? "Afficher les matchs terminés" : "Masquer les matchs terminés"}
              </button>
            )}
          </div>

          {predictable.length > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-neutral-500">
                <span>Progression</span>
                <span className="tabular-nums">
                  {predictableDone} / {predictable.length} matchs à venir
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-cta transition-[width]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {visibleRounds.length === 0 ? (
            <p className="p-6 text-center text-sm text-neutral-500">Aucun match à afficher.</p>
          ) : (
            <div className="space-y-2">
              {visibleRounds.map((round) => {
                const open = openRound === round.key;
                const complete = round.predicted === round.matches.length;
                return (
                  <div
                    key={round.key}
                    className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenRound(open ? null : round.key)}
                      className="flex min-h-tap w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <span className="font-semibold">{round.label}</span>
                      <span className="flex items-center gap-2 text-sm text-neutral-500">
                        <span className="tabular-nums">
                          {round.predicted}/{round.matches.length}
                        </span>
                        {complete && <span className="text-green-600 dark:text-green-400">✓</span>}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
                          {round.shown.map((m) => (
                            <InlineMatchCard
                              key={m.id}
                              match={m}
                              prediction={preds.get(m.id) ?? null}
                              timezone={timezone}
                              onSave={handleSave}
                              isBoost={boostedIds.has(m.id)}
                              roundHasBoost={boosts.has(round.key)}
                              onToggleBoost={
                                m.stage === "GROUP_STAGE"
                                  ? () => toggleBoost(round.key, m.id)
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {evaluated.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">Récap des matchs terminés</h2>
          {evaluated.map(({ m, base, bonus, boosted, pts }) => {
            const home = displayTeam(m.homeTeam.id, m.homeTeam.name);
            const away = displayTeam(m.awayTeam.id, m.awayTeam.name);
            const pred = preds.get(m.id)!;
            const tone =
              base === POINTS.exact
                ? "text-green-600 dark:text-green-400"
                : base === POINTS.outcome
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400";
            return (
              <Link
                key={m.id}
                href={`/match/${m.id}`}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm ${
                  boosted ? "border-emerald-500" : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <div>
                  <p className="font-medium">
                    {home.flag} {home.nameFr} – {away.nameFr} {away.flag}
                    {boosted && (
                      <span className="ml-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        ⚡
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatFull(m.utcDate, timezone)} · Pari : {pred.home}-{pred.away}
                    {m.score.regularTime?.home != null && (
                      <> (90’ : {m.score.regularTime.home}-{m.score.regularTime.away})</>
                    )}
                    {m.score.fullTime.home != null &&
                      (() => {
                        const ds = matchScore(m);
                        const suffix = scoreSuffix(ds);
                        return (
                          <>
                            {" "}· Résultat : {ds.home}-{ds.away}
                            {suffix ? ` ${suffix}` : ""}
                          </>
                        );
                      })()}
                  </p>
                </div>
                <span className={`shrink-0 font-bold tabular-nums ${tone}`}>
                  +{pts}
                  {boosted && base > 0 && <span className="text-emerald-600 dark:text-emerald-400"> (×2)</span>}
                  {bonus > 0 && <span className="text-amber-600 dark:text-amber-400"> (+{bonus} qualifié)</span>}
                </span>
              </Link>
            );
          })}
        </section>
      )}

      {rounds.length === 0 && (
        <p className="p-6 text-center text-sm text-neutral-500">Aucun match disponible.</p>
      )}
    </div>
  );
}
