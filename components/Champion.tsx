"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pickChampion } from "@/app/champion/actions";
import { Confetti, playCheer } from "./Confetti";
import type { ChampionData, BracketRound, BracketMatch, BracketTeam } from "@/lib/champion";

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="grid h-9 w-9 place-items-center rounded-full border border-neutral-300 text-lg font-bold dark:border-neutral-700"
      >
        −
      </button>
      <span className="w-6 text-center text-xl font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(20, value + 1))}
        className="grid h-9 w-9 place-items-center rounded-full border border-neutral-300 text-lg font-bold dark:border-neutral-700"
      >
        +
      </button>
    </div>
  );
}

export function Champion({ data }: { data: ChampionData }) {
  const router = useRouter();
  const [teamId, setTeamId] = useState<number | null>(data.myPick?.team.id ?? null);
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

  const selectedTeam = useMemo(
    () => data.availableTeams.find((t) => t.id === teamId) ?? data.myPick?.team ?? null,
    [data.availableTeams, data.myPick, teamId],
  );

  const submit = async () => {
    if (teamId == null) {
      setError("Choisis d'abord une équipe.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await pickChampion(teamId, champGoals, oppGoals);
    setSaving(false);
    if (res?.error) setError(res.error);
    else router.refresh();
  };

  const canEdit = !data.locked;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-5 p-4">
      <Confetti fireKey={cheer} />

      <header className="text-center">
        <h1 className="text-2xl font-bold">🏆 Prédis le Champion</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Qui soulèvera la Coupe du Monde 2026 ? Choisis l’équipe et le score exact de la finale.
        </p>
      </header>

      {/* Règles */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="font-bold">Comment ça marche</p>
        </div>
        <ul className="space-y-2 p-4 text-sm text-neutral-600 dark:text-neutral-300">
          <li>
            🎯 <b>Bon champion</b> → <b>+10 pts</b> au classement général.
          </li>
          <li>
            💥 <b>Bon champion + score exact de la finale</b> → <b>+30 pts</b>.
          </li>
          <li>🔒 Choix verrouillés au coup d’envoi des <b>8es de finale</b>.</li>
          <li>
            ⏱️ Score exact jugé sur le <b>score final</b> (prolongation comprise, hors tirs au but).
          </li>
        </ul>
      </div>

      {/* Mon statut */}
      <StatusBanner data={data} />

      {/* Choix (ou récap du choix verrouillé) */}
      {canEdit ? (
        <section className="space-y-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-bold">{data.myPick ? "Modifier mon choix" : "Mon choix"}</h2>

          {/* Équipe — tableau des phases finales */}
          <div>
            <p className="mb-2 text-sm text-neutral-500">
              1. L’équipe championne{" "}
              <span className="text-neutral-400">(clique une équipe dans le tableau)</span>
            </p>
            <Bracket rounds={data.bracket} selectedId={teamId} onSelect={setTeamId} canEdit />
          </div>

          {/* Score */}
          <div>
            <p className="mb-2 text-sm text-neutral-500">2. Le score exact de la finale</p>
            <div className="flex items-center justify-center gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900">
              <span className="flex items-center gap-1 text-sm font-semibold">
                {selectedTeam ? (
                  <>
                    {selectedTeam.flag} {selectedTeam.fr}
                  </>
                ) : (
                  "Ton champion"
                )}
              </span>
              <Stepper value={champGoals} onChange={setChampGoals} />
              <span className="text-neutral-400">–</span>
              <Stepper value={oppGoals} onChange={setOppGoals} />
              <span className="text-sm font-semibold text-neutral-500">Adversaire</span>
            </div>
            <p className="mt-1 text-center text-xs text-neutral-400">
              Ton champion doit gagner (ou faire nul puis l’emporter aux tirs au but).
            </p>
          </div>

          {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="min-h-tap w-full rounded-xl bg-cta font-semibold text-cta-fg transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : data.myPick ? "Modifier mon pari" : "Valider mon champion"}
          </button>
        </section>
      ) : (
        data.myPick && (
          <section className="rounded-2xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
            <p className="text-sm text-neutral-500">Mon pari (verrouillé)</p>
            <p className="mt-1 text-lg font-bold">
              {data.myPick.team.flag} {data.myPick.team.fr} · {data.myPick.champGoals}-
              {data.myPick.oppGoals}
            </p>
          </section>
        )
      )}

      {/* Visualisation des joueurs restants */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Encore en lice</h2>
          <span className="text-sm font-semibold text-neutral-500">
            {data.aliveCount}/{data.totalCount} joueurs
          </span>
        </div>

        {data.alive.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            Aucun pari pour l’instant. Sois le premier à choisir ton champion 🏆
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
              Éliminés ({data.eliminated.length})
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

interface ChipProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
  canEdit: boolean;
}

function BTeam({ t, winnerId, right, selectedId, onSelect, canEdit }: { t: BracketTeam; winnerId: number | null; right?: boolean } & ChipProps) {
  const isSel = t.id != null && t.id === selectedId;
  const isWinner = t.id != null && t.id === winnerId;
  const clickable = canEdit && t.id != null && !t.eliminated;
  return (
    <button
      type="button"
      disabled={!clickable}
      title={t.fr}
      onClick={() => t.id != null && onSelect(t.id)}
      className={`flex w-full items-center gap-1 px-1.5 py-1 text-[11px] font-semibold transition ${
        right ? "flex-row-reverse text-right" : ""
      } ${
        isSel
          ? "bg-accent text-white"
          : t.eliminated
            ? "text-neutral-400 line-through"
            : clickable
              ? "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              : "text-neutral-500"
      }`}
    >
      <span className="text-sm">{t.flag}</span>
      <span className="flex-1 truncate">{t.code}</span>
      {isWinner && !isSel && <span className="text-green-600 dark:text-green-400">✓</span>}
    </button>
  );
}

function MatchBox({ m, right, ...p }: { m: BracketMatch; right?: boolean } & ChipProps) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
      <BTeam t={m.home} winnerId={m.winnerId} right={right} {...p} />
      <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
      <BTeam t={m.away} winnerId={m.winnerId} right={right} {...p} />
    </div>
  );
}

function Col({ label, ms, right, ...p }: { label: string; ms: BracketMatch[]; right?: boolean } & ChipProps) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <p className="text-center text-[10px] font-bold uppercase text-neutral-400">{label}</p>
      <div className="flex flex-1 flex-col justify-around gap-1">
        {ms.map((m, i) => (
          <MatchBox key={i} m={m} right={right} {...p} />
        ))}
      </div>
    </div>
  );
}

/** Bracket 2 côtés : 8es (extérieur) → quarts → demies → finale (centre). */
function Bracket({ rounds, ...p }: { rounds: BracketRound[] } & ChipProps) {
  const by = (k: string) => rounds.find((r) => r.key === k)?.matches ?? [];
  const half = (a: BracketMatch[]): [BracketMatch[], BracketMatch[]] => {
    const h = Math.ceil(a.length / 2);
    return [a.slice(0, h), a.slice(h)];
  };
  const [l16L, l16R] = half(by("LAST_16"));
  const [qfL, qfR] = half(by("QUARTER_FINALS"));
  const [sfL, sfR] = half(by("SEMI_FINALS"));
  const fin = by("FINAL")[0] ?? null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <div className="flex min-w-[580px] items-stretch gap-1.5">
        <Col label="8es" ms={l16L} {...p} />
        <Col label="Quarts" ms={qfL} {...p} />
        <Col label="Demies" ms={sfL} {...p} />
        <div className="flex w-16 flex-col items-center justify-center gap-1">
          <p className="text-[10px] font-bold uppercase text-amber-500">Finale</p>
          <span className="text-3xl">🏆</span>
          {fin && <MatchBox m={fin} {...p} />}
        </div>
        <Col label="Demies" ms={sfR} right {...p} />
        <Col label="Quarts" ms={qfR} right {...p} />
        <Col label="8es" ms={l16R} right {...p} />
      </div>
    </div>
  );
}

function StatusBanner({ data }: { data: ChampionData }) {
  const map: Record<ChampionData["myState"], { cls: string; text: string }> = {
    "can-pick": {
      cls: "border-accent bg-accent-soft",
      text: "🎮 Fais ton pronostic de champion avant les 8es !",
    },
    alive: {
      cls: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
      text: `🟢 ${data.myPick?.team.flag} ${data.myPick?.team.fr} est toujours en lice !`,
    },
    out: {
      cls: "border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-950/30",
      text: `🔴 ${data.myPick?.team.flag} ${data.myPick?.team.fr} est éliminé — pas de points cette fois.`,
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
