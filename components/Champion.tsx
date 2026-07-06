"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pickChampion } from "@/app/champion/actions";
import { Confetti, playCheer } from "./Confetti";
import type {
  ChampionData,
  ChampionTeam,
  ChampionPickView,
  BracketRound,
  BracketMatch,
  BracketTeam,
} from "@/lib/champion";

// En prod, la révélation des pronostics dépend du vrai verrou (fin des 8es).
const DEMO_LOCK_PREVIEW = false;
const DEMO_PICKS: ChampionPickView[] = [];

type Side = "L" | "R";

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="grid h-9 w-9 place-items-center rounded-full border border-neutral-300 text-lg font-bold dark:border-neutral-700"
        aria-label="Moins"
      >
        −
      </button>
      <span className="w-6 text-center text-xl font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(20, value + 1))}
        className="grid h-9 w-9 place-items-center rounded-full border border-neutral-300 text-lg font-bold dark:border-neutral-700"
        aria-label="Plus"
      >
        +
      </button>
    </div>
  );
}

export function Champion({ data }: { data: ChampionData }) {
  const router = useRouter();

  // Un choix par moitié du tableau + désignation du vainqueur.
  const initLeft =
    data.myPick?.team.half === "L"
      ? data.myPick.team.id
      : data.myPick?.finalist?.half === "L"
        ? data.myPick.finalist.id
        : null;
  const initRight =
    data.myPick?.team.half === "R"
      ? data.myPick.team.id
      : data.myPick?.finalist?.half === "R"
        ? data.myPick.finalist.id
        : null;

  const [leftId, setLeftId] = useState<number | null>(initLeft);
  const [rightId, setRightId] = useState<number | null>(initRight);
  const [championSide, setChampionSide] = useState<Side>(data.myPick?.team.half === "R" ? "R" : "L");
  const [champGoals, setChampGoals] = useState(data.myPick?.champGoals ?? 2);
  const [oppGoals, setOppGoals] = useState(data.myPick?.oppGoals ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cheer, setCheer] = useState(0);

  useEffect(() => {
    if (data.iWon) {
      setCheer(1);
      playCheer();
    }
  }, [data.iWon]);

  // Répertoire des équipes (pour retrouver drapeau/nom depuis un id).
  const teamById = useMemo(() => {
    const map = new Map<number, ChampionTeam>();
    for (const t of data.availableTeams) map.set(t.id, t);
    if (data.myPick) {
      map.set(data.myPick.team.id, data.myPick.team);
      if (data.myPick.finalist) map.set(data.myPick.finalist.id, data.myPick.finalist);
    }
    return map;
  }, [data.availableTeams, data.myPick]);

  const leftTeam = leftId != null ? teamById.get(leftId) ?? null : null;
  const rightTeam = rightId != null ? teamById.get(rightId) ?? null : null;
  const championTeam = championSide === "L" ? leftTeam : rightTeam;
  const finalistTeam = championSide === "L" ? rightTeam : leftTeam;
  const bothPicked = leftTeam != null && rightTeam != null;

  const onPick = (side: Side, id: number) => {
    if (side === "L") setLeftId(id);
    else setRightId(id);
  };

  const submit = async () => {
    if (!championTeam || !finalistTeam) {
      setError("Choisis une équipe dans chaque moitié du tableau.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await pickChampion(championTeam.id, finalistTeam.id, champGoals, oppGoals);
    setSaving(false);
    if (res?.error) setError(res.error);
    else router.refresh();
  };

  const canEdit = !data.locked;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-5 p-4">
      <Confetti fireKey={cheer} />

      <header className="text-center">
        <h1 className="text-2xl font-bold">🔮 Prédiction</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Quelle sera la finale de cette Coupe du Monde 2026 ?
        </p>
      </header>

      {/* Statut du joueur */}
      <StatusBanner data={data} />

      {canEdit ? (
        <section className="space-y-5 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          {/* Récap « Ta finale » */}
          <FinaleRecap
            championTeam={championTeam}
            finalistTeam={finalistTeam}
            champGoals={champGoals}
            oppGoals={oppGoals}
          />

          {/* 1. Les deux finalistes via le bracket */}
          <div>
            <p className="mb-1 text-sm font-semibold">1. Compose ta finale</p>
            <p className="mb-2 text-xs text-neutral-400">
              Sélectionne ton finaliste du tableau de gauche puis de droite.
            </p>
            <Bracket
              rounds={data.bracket}
              leftId={leftId}
              rightId={rightId}
              championSide={championSide}
              onPick={onPick}
              canEdit
            />
          </div>

          {/* 2. Qui gagne */}
          <div>
            <p className="mb-2 text-sm font-semibold">2. Qui soulève le trophée&nbsp;?</p>
            <div className="grid grid-cols-2 gap-2">
              {(["L", "R"] as const).map((side) => {
                const t = side === "L" ? leftTeam : rightTeam;
                const active = championSide === side;
                return (
                  <button
                    key={side}
                    type="button"
                    disabled={!t}
                    onClick={() => setChampionSide(side)}
                    className={`min-h-tap rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10"
                        : "border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-800 dark:hover:bg-neutral-900"
                    }`}
                  >
                    {active && "🏆 "}
                    {t ? (
                      <>
                        {t.flag} {t.fr}
                      </>
                    ) : (
                      <span className="text-neutral-400">
                        {side === "L" ? "Moitié gauche" : "Moitié droite"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Score de la finale */}
          <div>
            <p className="mb-2 text-sm font-semibold">3. Le score de la finale</p>
            <div className="flex items-center justify-center gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900">
              <span className="flex max-w-[38%] items-center gap-1 truncate text-sm font-semibold">
                {championTeam ? (
                  <>
                    <span>🏆</span> {championTeam.flag}
                  </>
                ) : (
                  "🏆"
                )}
              </span>
              <Stepper value={champGoals} onChange={setChampGoals} />
              <span className="text-neutral-400">–</span>
              <Stepper value={oppGoals} onChange={setOppGoals} />
              <span className="flex max-w-[38%] items-center gap-1 truncate text-sm font-semibold">
                {finalistTeam ? (
                  <>
                    {finalistTeam.flag} <span>🥈</span>
                  </>
                ) : (
                  "🥈"
                )}
              </span>
            </div>
            <p className="mt-1 text-center text-xs text-neutral-400">
              Ton champion doit l’emporter (nul possible puis victoire aux tirs au but).
            </p>
          </div>

          {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={saving || !bothPicked}
            className="min-h-tap w-full rounded-xl bg-cta font-semibold text-cta-fg transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : data.myPick ? "Modifier ma finale" : "Valider ma finale"}
          </button>
        </section>
      ) : (
        data.myPick && (
          <section className="rounded-2xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
            <p className="text-sm text-neutral-500">Ma finale (verrouillée)</p>
            <p className="mt-1 text-lg font-bold">
              🏆 {data.myPick.team.flag} {data.myPick.team.fr}
              {data.myPick.finalist && (
                <>
                  {" "}
                  <span className="text-neutral-400">vs</span> 🥈 {data.myPick.finalist.flag}{" "}
                  {data.myPick.finalist.fr}
                </>
              )}
            </p>
            <p className="text-sm text-neutral-500">
              Score : {data.myPick.champGoals}-{data.myPick.oppGoals}
            </p>
          </section>
        )
      )}

      {/* Barème */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="font-bold">Comment marquer des points</p>
        </div>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <ScoreRow
            emoji="🎬"
            title="Bonne affiche"
            desc="Tes 2 finalistes atteignent la finale"
            pts="+10"
          />
          <ScoreRow emoji="🏆" title="Bon champion" desc="Ton vainqueur soulève le trophée" pts="+10" />
          <ScoreRow
            emoji="🎯"
            title="Score exact de la finale"
            desc="Bon champion + score exact"
            pts="+20"
          />
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
          <span>🔒 Verrouillé à la fin des 8es de finale</span>
          <span className="font-semibold text-neutral-600 dark:text-neutral-300">Max 40 pts</span>
        </div>
      </div>

      {/* Pronostics des joueurs (verrouillé) / encore en lice */}
      {(() => {
        const showLocked = data.revealPicks || DEMO_LOCK_PREVIEW;
        const lockedPicks =
          data.allPicks.length > 0 ? data.allPicks : DEMO_LOCK_PREVIEW ? DEMO_PICKS : [];
        if (showLocked) {
          return (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Les pronostics des joueurs</h2>
                <span className="text-sm font-semibold text-neutral-500">
                  {lockedPicks.length} prono{lockedPicks.length > 1 ? "s" : ""}
                </span>
              </div>
              {lockedPicks.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
                  Aucun pronostic n’a été enregistré.
                </p>
              ) : (
                <ul className="space-y-2">
                  {lockedPicks.map((pk, i) => (
                    <PickPastille key={`${pk.username}-${i}`} pk={pk} champion={data.champion} />
                  ))}
                </ul>
              )}
            </section>
          );
        }
        return null;
      })()}

      {/* Joueurs en lice (avant verrouillage) */}
      <section className={`space-y-3 ${data.revealPicks || DEMO_LOCK_PREVIEW ? "hidden" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Encore en lice</h2>
          <span className="text-sm font-semibold text-neutral-500">
            {data.aliveCount}/{data.totalCount} joueurs
          </span>
        </div>

        {data.alive.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            Aucune finale pour l’instant. Sois le premier à composer la tienne 🏆
          </p>
        ) : (
          <div className="space-y-2">
            {data.alive.map((g) => {
              const isChamp = data.champion?.id === g.team.id;
              return (
                <div
                  key={g.team.id}
                  className={`rounded-2xl border p-3 ${
                    isChamp
                      ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-xl">{g.team.flag}</span>
                    <span className="font-semibold">{g.team.fr}</span>
                    {isChamp && <span className="text-sm font-bold text-yellow-600">🏆 Championne</span>}
                    <span className="ml-auto text-xs text-neutral-400">
                      {g.usernames.length} pari{g.usernames.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.usernames.map((u) => (
                      <span
                        key={u}
                        className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium dark:bg-neutral-800"
                      >
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data.eliminated.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="mb-2 text-sm font-bold text-neutral-400">
              Champions éliminés ({data.eliminated.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.eliminated.map((e, i) => (
                <span
                  key={`${e.username}-${i}`}
                  className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-400 line-through dark:bg-neutral-800"
                  title={e.team.fr}
                >
                  {e.team.flag} {e.username}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** Carte de synthèse « Ta finale » (aperçu du pari en cours). */
function FinaleRecap({
  championTeam,
  finalistTeam,
  champGoals,
  oppGoals,
}: {
  championTeam: ChampionTeam | null;
  finalistTeam: ChampionTeam | null;
  champGoals: number;
  oppGoals: number;
}) {
  return (
    <div className="rounded-2xl border border-yellow-300/50 bg-gradient-to-b from-yellow-50 to-transparent p-4 dark:border-yellow-500/30 dark:from-yellow-500/10">
      <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
        🏆 Ta finale
      </p>
      <div className="flex items-center justify-center gap-3">
        <TeamSlot team={championTeam} role="🏆 Champion" />
        <div className="text-center">
          <div className="text-2xl font-black tabular-nums">
            {champGoals}
            <span className="mx-1 text-neutral-400">-</span>
            {oppGoals}
          </div>
          <div className="text-[10px] font-semibold uppercase text-neutral-400">Finale</div>
        </div>
        <TeamSlot team={finalistTeam} role="🥈 Finaliste" />
      </div>
    </div>
  );
}

function TeamSlot({ team, role }: { team: ChampionTeam | null; role: string }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-3xl">{team ? team.flag : "❔"}</div>
      <div className="mt-1 truncate text-sm font-bold">
        {team ? team.fr : <span className="text-neutral-400">À choisir</span>}
      </div>
      <div className="text-[10px] font-semibold uppercase text-neutral-400">{role}</div>
    </div>
  );
}

/** Ligne du barème : pastille emoji + libellé + points. */
function ScoreRow({
  emoji,
  title,
  desc,
  pts,
}: {
  emoji: string;
  title: string;
  desc: string;
  pts: string;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-xl dark:bg-neutral-800">
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-neutral-400">{desc}</p>
      </div>
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold tabular-nums text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
        {pts}
      </span>
    </li>
  );
}

/** Pastille du pronostic d'un joueur (affichée une fois le jeu verrouillé). */
function PickPastille({ pk, champion }: { pk: ChampionPickView; champion: ChampionTeam | null }) {
  const gotChampion = champion != null && champion.id === pk.champion.id;
  return (
    <li
      className={`flex items-center gap-2 rounded-2xl border p-3 ${
        gotChampion
          ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{pk.username}</span>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold dark:bg-neutral-800">
        <span title={`Champion : ${pk.champion.fr}`}>🏆&nbsp;{pk.champion.flag}</span>
        <span className="tabular-nums text-neutral-500">
          {pk.champGoals}-{pk.oppGoals}
        </span>
        {pk.finalist && <span title={`Finaliste : ${pk.finalist.fr}`}>{pk.finalist.flag}</span>}
      </span>
    </li>
  );
}

interface ChipProps {
  leftId: number | null;
  rightId: number | null;
  championSide: Side;
  onPick: (side: Side, id: number) => void;
  canEdit: boolean;
}

function BTeam({
  t,
  side,
  winnerId,
  right,
  leftId,
  rightId,
  championSide,
  onPick,
  canEdit,
}: { t: BracketTeam; side: Side; winnerId: number | null; right?: boolean } & ChipProps) {
  const selectedId = side === "L" ? leftId : rightId;
  const isSel = t.id != null && t.id === selectedId;
  const isChampSel = isSel && championSide === side;
  const isWinner = t.id != null && t.id === winnerId;
  const clickable = canEdit && t.id != null && !t.eliminated;
  return (
    <button
      type="button"
      disabled={!clickable}
      title={t.fr}
      onClick={() => t.id != null && onPick(side, t.id)}
      className={`flex w-full items-center gap-1 px-1.5 py-1 text-[11px] font-semibold transition ${
        right ? "flex-row-reverse text-right" : ""
      } ${
        isSel
          ? isChampSel
            ? "bg-yellow-400 text-neutral-900"
            : "bg-accent text-white"
          : t.eliminated
            ? "text-neutral-400 line-through"
            : clickable
              ? "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              : "text-neutral-500"
      }`}
    >
      <span className="text-sm">{t.flag}</span>
      <span className="flex-1 truncate">{t.code}</span>
      {isSel && <span>{isChampSel ? "🏆" : "🥈"}</span>}
      {isWinner && !isSel && <span className="text-green-600 dark:text-green-400">✓</span>}
    </button>
  );
}

function MatchBox({ m, side, right, ...p }: { m: BracketMatch; side: Side; right?: boolean } & ChipProps) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
      <BTeam t={m.home} side={side} winnerId={m.winnerId} right={right} {...p} />
      <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
      <BTeam t={m.away} side={side} winnerId={m.winnerId} right={right} {...p} />
    </div>
  );
}

function Col({
  label,
  ms,
  side,
  right,
  ...p
}: { label: string; ms: BracketMatch[]; side: Side; right?: boolean } & ChipProps) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <p className="text-center text-[10px] font-bold uppercase text-neutral-400">{label}</p>
      <div className="flex flex-1 flex-col justify-around gap-1">
        {ms.map((m, i) => (
          <MatchBox key={i} m={m} side={side} right={right} {...p} />
        ))}
      </div>
    </div>
  );
}

/** Bracket 2 côtés : 8es (extérieur) → quarts → demies → finale (centre). */
function Bracket({ rounds, ...p }: { rounds: BracketRound[] } & ChipProps) {
  const by = (k: string) => rounds.find((r) => r.key === k)?.matches ?? [];
  // Le côté est calculé côté serveur (bracket entrelacé) : on filtre, sans re-couper.
  const side = (k: string, s: "L" | "R") => by(k).filter((m) => m.side === s);
  const l16L = side("LAST_16", "L");
  const l16R = side("LAST_16", "R");
  const qfL = side("QUARTER_FINALS", "L");
  const qfR = side("QUARTER_FINALS", "R");
  const sfL = side("SEMI_FINALS", "L");
  const sfR = side("SEMI_FINALS", "R");

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <div className="flex min-w-[600px] items-stretch gap-1.5">
        <Col label="8es" ms={l16L} side="L" {...p} />
        <Col label="Quarts" ms={qfL} side="L" {...p} />
        <Col label="Demies" ms={sfL} side="L" {...p} />
        <div className="flex w-14 flex-col items-center justify-center gap-1">
          <p className="text-[10px] font-bold uppercase text-amber-500">Finale</p>
          <span className="text-3xl">🏆</span>
        </div>
        <Col label="Demies" ms={sfR} side="R" right {...p} />
        <Col label="Quarts" ms={qfR} side="R" right {...p} />
        <Col label="8es" ms={l16R} side="R" right {...p} />
      </div>
    </div>
  );
}

function StatusBanner({ data }: { data: ChampionData }) {
  const map: Record<ChampionData["myState"], { cls: string; text: string }> = {
    "can-pick": {
      cls: "border-accent bg-accent-soft",
      text: "🎮 Compose ta finale avant la fin des 8es de finale !",
    },
    alive: {
      cls: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
      text: `🟢 ${data.myPick?.team.flag} ${data.myPick?.team.fr} est toujours en lice !`,
    },
    out: {
      cls: "border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-950/30",
      text: `🔴 ${data.myPick?.team.flag} ${data.myPick?.team.fr} est éliminé — le champion ne rapportera pas.`,
    },
    champion: {
      cls: "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10",
      text: `🏆 ${data.myPick?.team.flag} ${data.myPick?.team.fr} championne ! +${data.myPoints} pts`,
    },
    missed: {
      cls: "border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900",
      text: "🔒 Les choix sont fermés — tu n’as pas participé cette fois.",
    },
  };
  const s = map[data.myState];
  return <div className={`rounded-2xl border p-4 text-sm font-semibold ${s.cls}`}>{s.text}</div>;
}
