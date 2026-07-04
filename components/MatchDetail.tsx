"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePreferences } from "./PreferencesProvider";
import { ScorePicker } from "./ScorePicker";
import { IcsButton } from "./IcsButton";
import { CommunityBar } from "./CommunityBar";
import type { CommunityStats } from "@/lib/community";
import { savePrediction } from "@/app/predictions/actions";
import { formatFull } from "@/lib/timezone";
import { calendarFilename } from "@/lib/ics";
import { displayTeam } from "@/data/teams";
import { isFinished, isLive, matchScore, type Match } from "@/lib/api";
import {
  POINTS,
  predictionPoints,
  qualifierBonus,
  hasQualifierOption,
  type ScorePrediction,
  type Qualifier,
} from "@/lib/predictions";
import { ResultHero, stageLabel } from "./ResultHero";
import { StadiumHero, FlagCircle } from "./StadiumHero";

export function MatchDetail({
  match,
  prediction,
  isLoggedIn,
  community,
}: {
  match: Match;
  prediction: ScorePrediction | null;
  isLoggedIn: boolean;
  community: CommunityStats | null;
}) {
  const { timezone } = usePreferences();
  const router = useRouter();

  const home = displayTeam(match.homeTeam.id, match.homeTeam.name);
  const away = displayTeam(match.awayTeam.id, match.awayTeam.name);
  const live = isLive(match.status);
  const finished = isFinished(match.status);
  const canPredict = match.status === "SCHEDULED" || match.status === "TIMED";
  const ds = matchScore(match);
  const showScore = (live || finished) && ds.home != null && ds.away != null;

  const [score, setScore] = useState<ScorePrediction>(prediction ?? { home: 0, away: 0 });
  const [savedScore, setSavedScore] = useState<ScorePrediction | null>(prediction);
  const [qualifier, setQualifier] = useState<Qualifier | null>(prediction?.qualifier ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // À partir des 8es de finale, si le prono est un nul, le joueur doit désigner
  // l'équipe qualifiée (bonus +2 pts si correct).
  const showQualifier = hasQualifierOption(match.stage) && score.home === score.away;
  const effQualifier = showQualifier ? qualifier : null;

  const isDirty =
    !savedScore ||
    savedScore.home !== score.home ||
    savedScore.away !== score.away ||
    (savedScore.qualifier ?? null) !== effQualifier;

  // Résultat du pronostic (affiché dans la carte, pour un match terminé).
  const predResult =
    finished && prediction
      ? (() => {
          const base = predictionPoints(prediction, match) ?? 0;
          const bonus = qualifierBonus(prediction, match);
          return { home: prediction.home, away: prediction.away, base, points: base + bonus };
        })()
      : null;
  const reg = match.score.regularTime;

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const res = await savePrediction(match.id, score.home, score.away, effQualifier);
    setSaving(false);
    if (res?.error) setError(res.error);
    else {
      setSavedScore({ home: score.home, away: score.away, qualifier: effQualifier });
      router.refresh(); // met à jour les points dans l'en-tête
    }
  };

  return (
    <div className="animate-fade-in">
      {finished && ds.home != null && ds.away != null && (
        <ResultHero
          stadium="/stadium-1.jpg"
          home={{ flag: home.flag, nameFr: home.nameFr, tla: match.homeTeam.tla }}
          away={{ flag: away.flag, nameFr: away.nameFr, tla: match.awayTeam.tla }}
          score={{ home: ds.home, away: ds.away }}
          pens={ds.penalties}
          aet={ds.aet}
          reg={reg?.home != null ? { home: reg.home, away: reg.away ?? 0 } : null}
          stage={stageLabel(match.stage, match.group)}
          date={formatFull(match.utcDate, timezone)}
          prediction={predResult}
        />
      )}

      {/* Pronos de la communauté — uniquement sur un match terminé. */}
      {finished && community && community.total > 0 && (
        <div className="mx-auto max-w-xl p-4">
          <CommunityBar
            stats={community}
            homeName={home.nameFr}
            awayName={away.nameFr}
            homeFlag={home.flag}
            awayFlag={away.flag}
          />
        </div>
      )}

      {!finished && (
        <StadiumHero
          fullScreen
          cardClassName={
            savedScore && !isDirty
              ? "border-green-400/70 ring-1 ring-green-400/40"
              : "border-white/20"
          }
        >
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest">
              {live ? "En direct" : "À venir"}
            </p>
            <p className="text-xs text-white/70">{formatFull(match.utcDate, timezone)}</p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            <FlagCircle tla={match.homeTeam.tla} emoji={home.flag} />
            <div className="text-center">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {stageLabel(match.stage, match.group)}
              </span>
              {showScore ? (
                <div className="mt-1 text-4xl font-black tabular-nums">
                  {ds.home} <span className="text-white/40">-</span> {ds.away}
                </div>
              ) : (
                <div className="mt-1 text-3xl font-black text-white/50">VS</div>
              )}
              {live && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-100">
                  ● DIRECT
                </span>
              )}
            </div>
            <FlagCircle tla={match.awayTeam.tla} emoji={away.flag} />
          </div>

          {/* Mon pronostic intégré */}
          <div className="mt-4 border-t border-white/15 pt-4">
            <p className="mb-3 flex items-center justify-center gap-2 text-center text-[10px] font-semibold uppercase tracking-widest text-white/60">
              Mon pronostic
              {savedScore && !isDirty && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/25 px-2 py-0.5 text-green-100">
                  ✓ Enregistré
                </span>
              )}
            </p>
            {canPredict && !isLoggedIn ? (
              <Link
                href="/connexion"
                className="block rounded-xl border border-dashed border-white/30 p-4 text-center text-sm text-white/90"
              >
                <span className="font-medium">Connecte-toi pour pronostiquer</span>
                <span className="mt-1 block text-white/60">Ton score comptera au classement.</span>
              </Link>
            ) : canPredict ? (
              <div className="space-y-3">
                <ScorePicker home={home} away={away} value={score} onChange={setScore} />

                {showQualifier && (
                  <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3">
                    <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-amber-100">
                      Match nul : qui se qualifie ? <span className="text-amber-200/80">(+2 pts)</span>
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(["home", "away"] as const).map((side) => {
                        const team = side === "home" ? home : away;
                        const active = qualifier === side;
                        return (
                          <button
                            key={side}
                            type="button"
                            onClick={() => setQualifier(active ? null : side)}
                            className={`min-h-tap rounded-xl border px-2 py-2 text-sm font-semibold transition ${
                              active
                                ? "border-amber-300 bg-amber-400 text-neutral-900"
                                : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                            }`}
                          >
                            {team.flag} {team.nameFr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-center text-sm text-red-300">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving || !isDirty}
                  className="min-h-tap w-full cursor-pointer rounded-xl bg-cta font-semibold text-cta-fg transition hover:brightness-110 disabled:opacity-50"
                >
                  {saving
                    ? "Enregistrement…"
                    : isDirty
                      ? "Enregistrer mon pronostic"
                      : "✓ Pronostic enregistré"}
                </button>
                <p className="text-center text-xs text-white/50">
                  Score exact : {POINTS.exact} pts · bon résultat : {POINTS.outcome} pts.
                </p>
              </div>
            ) : (
              <p className="text-center text-sm text-white/70">
                Match en cours — pronostic clôturé.
                {savedScore && ` Ton pari : ${savedScore.home} - ${savedScore.away}.`}
              </p>
            )}
          </div>

          {/* Ajouter au calendrier — à l'intérieur du hero */}
          <div className="mt-4 flex justify-center">
            <IcsButton
              matches={[match]}
              filename={calendarFilename(match)}
              label="Ajouter à mon calendrier"
              variant="glass"
            />
          </div>
        </StadiumHero>
      )}
    </div>
  );
}
