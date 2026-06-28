"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pickSurvivor } from "@/app/survivor/actions";
import { Confetti, playCheer } from "./Confetti";
import type { SurvivorData, PickMatch } from "@/lib/survivor";

const RULES = [
  {
    color: "bg-accent-soft text-accent",
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
    text: <>Chaque tour, choisis <b>1 équipe</b> qui doit <b>gagner</b> son match.</>,
  },
  {
    color: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    icon: <><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>,
    text: <>Un <b>nul</b> ou une <b>défaite</b> et tu es <b>éliminé</b>.</>,
  },
  {
    color: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6 18.4 18.4" /></>,
    text: <>Une équipe ne peut être choisie <b>qu’une seule fois</b> du tournoi.</>,
  },
  {
    color: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    icon: <><circle cx="12" cy="8" r="5" /><path d="m9 12.5-2 8.5 5-3 5 3-2-8.5" /></>,
    text: <>Le <b>dernier survivant</b> remporte <b>+10 pts</b> au classement général.</>,
  },
];

export function Survivor({ data }: { data: SurvivorData }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(data.myPickTeamId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cheer, setCheer] = useState(0);
  const used = new Set(data.usedTeamIds);

  useEffect(() => {
    if (data.iWon) {
      setCheer(1);
      playCheer();
    }
  }, [data.iWon]);

  const choose = async (matchId: number, teamId: number) => {
    setError(null);
    const prev = selected;
    setSelected(teamId); // optimiste
    setSaving(true);
    const res = await pickSurvivor(matchId, teamId);
    setSaving(false);
    if (res?.error) {
      setSelected(prev);
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  const alive = data.players.filter((p) => p.alive);
  const out = data.players.filter((p) => !p.alive);

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <h1 className="text-2xl font-bold">Mode Survivor 💀</h1>

      {/* Écran vainqueur */}
      {data.iWon && (
        <>
          <Confetti fireKey={cheer} />
          <div className="rounded-3xl border border-amber-400 bg-gradient-to-b from-amber-50 to-orange-50 p-6 text-center dark:from-amber-500/15 dark:to-orange-500/10">
            <div className="text-6xl" aria-hidden="true">🏆</div>
            <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Dernier survivant
            </p>
            <p className="mt-1 text-2xl font-bold">Tu as remporté le Survivor !</p>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Tu as survécu à tous les tours. <b>+10 pts</b> ajoutés à ton classement général. 🎉
            </p>
          </div>
        </>
      )}

      {/* Vainqueur(s) — vu par les autres joueurs */}
      {!data.iWon && data.winners.length > 0 && (
        <div className="rounded-2xl border border-amber-400 bg-amber-50 p-4 text-center font-bold dark:bg-amber-500/10">
          🏆 Survivor remporté par {data.winners.join(", ")} — +10 pts au classement !
        </div>
      )}

      {/* Règles */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="font-bold">💀 Comment survivre</p>
        </div>
        <ul className="space-y-3 p-4 text-sm">
          {RULES.map((r, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${r.color}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  {r.icon}
                </svg>
              </span>
              <span className="text-neutral-600 dark:text-neutral-300">{r.text}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-neutral-200 px-4 py-2.5 text-xs text-neutral-500 dark:border-neutral-800">
          En phase finale, c’est le <b>qualifié réel</b> qui compte : une victoire en{" "}
          <b>prolongation</b> ou aux <b>tirs au but</b> te fait passer suivant.
        </p>
      </div>

      {/* Statut */}
      <div
        className={`flex items-center justify-between rounded-2xl border p-4 ${
          data.myState === "eliminated"
            ? "border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-950/30"
            : data.myState === "join-closed"
              ? "border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
              : "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
        }`}
      >
        <span className="text-lg font-bold">
          {data.myState === "eliminated"
            ? "🔴 Éliminé"
            : data.myState === "join-closed"
              ? "🔒 Inscriptions fermées"
              : data.myState === "can-join"
                ? "🎮 Rejoins le Survivor !"
                : "🟢 En vie"}
        </span>
        <span className="text-sm font-semibold text-neutral-500">
          {data.aliveCount}/{data.totalCount} survivants
        </span>
      </div>

      {data.myState === "join-closed" && (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Le Survivor a démarré sans toi : l’entrée n’était possible qu’à la Journée 1. Rendez-vous
          au prochain tournoi ! (Tu peux suivre les survivants ci-dessous.)
        </p>
      )}

      {/* Survivants / éliminés */}
      {data.players.length > 0 && (
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="mb-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">🟢 En vie ({alive.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {alive.map((p) => (
                <span key={p.username} className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {p.username}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="mb-2 text-sm font-bold text-neutral-500">💀 Éliminés ({out.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {out.map((p) => (
                <span key={p.username} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-400 line-through dark:bg-neutral-800">
                  {p.username}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Parcours */}
      {data.myState !== "join-closed" && (
      <section>
        <h2 className="mb-2 font-bold">Ton parcours</h2>
        <ol className="space-y-0">
          {data.rounds.map((r, idx) => {
            const dot =
              r.state === "won"
                ? "bg-emerald-500 text-white"
                : r.state === "lost" || r.state === "missed"
                  ? "bg-red-500 text-white"
                  : r.state === "current"
                    ? "bg-accent text-white ring-4 ring-accent/20"
                    : "bg-neutral-200 text-neutral-400 dark:bg-neutral-800";
            return (
              <li key={r.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${dot}`}>
                    {r.state === "won" ? "✓" : r.state === "lost" || r.state === "missed" ? "✕" : r.state === "locked" ? "🔒" : idx + 1}
                  </span>
                  {idx < data.rounds.length - 1 && <span className="my-1 w-0.5 flex-1 bg-neutral-200 dark:bg-neutral-800" />}
                </div>

                <div className={`flex-1 pb-5 ${r.state === "locked" ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{r.label}</span>
                    {r.key === "FINAL" && (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950">🏆 +10 pts</span>
                    )}
                  </div>

                  {r.state === "won" && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      {r.teamFlag} {r.teamFr} a gagné ({r.result}) ✓
                    </p>
                  )}
                  {r.state === "lost" && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {r.teamFlag} {r.teamFr} n’a pas gagné ({r.result}) ✕
                    </p>
                  )}
                  {r.state === "missed" && (
                    <p className="text-sm text-red-600 dark:text-red-400">Aucun choix — éliminé ✕</p>
                  )}
                  {r.state === "locked" && <p className="text-sm text-neutral-400">Verrouillé</p>}

                  {r.state === "current" && (
                    <CurrentRound
                      data={data}
                      selected={selected}
                      used={used}
                      saving={saving}
                      onChoose={choose}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>
      )}
    </div>
  );
}

function CurrentRound({
  data,
  selected,
  used,
  saving,
  onChoose,
}: {
  data: SurvivorData;
  selected: number | null;
  used: Set<number>;
  saving: boolean;
  onChoose: (matchId: number, teamId: number) => void;
}) {
  if (data.pickLocked) {
    return <p className="mt-1 text-sm text-neutral-500">🔒 Choix verrouillé pour ce tour (match commencé).</p>;
  }
  if (data.pickMatches.length === 0) {
    return <p className="mt-1 text-sm text-neutral-500">Choix bientôt disponible (matchs pas encore programmés).</p>;
  }
  const sel = data.pickMatches.flatMap((m) => [m.home, m.away]).find((t) => t.id === selected);
  return (
    <div className="mt-2 space-y-2">
      <p className="text-sm text-neutral-500">Choisis l’équipe qui doit gagner :</p>
      {data.pickMatches.map((m) => (
        <div key={m.matchId} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
          <TeamBtn t={m.home} matchId={m.matchId} selected={selected} used={used} saving={saving} onChoose={onChoose} align="left" />
          <span className="text-xs text-neutral-400">vs</span>
          <TeamBtn t={m.away} matchId={m.matchId} selected={selected} used={used} saving={saving} onChoose={onChoose} align="right" />
        </div>
      ))}
      {sel && (
        <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium">
          {sel.flag} <b>{sel.fr}</b> doit gagner son match pour que tu passes au tour suivant.
        </p>
      )}
    </div>
  );
}

function TeamBtn({
  t,
  matchId,
  selected,
  used,
  saving,
  onChoose,
  align,
}: {
  t: PickMatch["home"];
  matchId: number;
  selected: number | null;
  used: Set<number>;
  saving: boolean;
  onChoose: (matchId: number, teamId: number) => void;
  align: "left" | "right";
}) {
  const isUsed = used.has(t.id);
  const isSel = selected === t.id;
  return (
    <button
      type="button"
      disabled={isUsed || saving}
      onClick={() => onChoose(matchId, t.id)}
      title={isUsed ? "Déjà utilisée lors d'un tour précédent" : undefined}
      className={`flex min-h-tap items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
        align === "right" ? "flex-row-reverse text-right" : ""
      } ${
        isSel
          ? "border-accent bg-accent text-white"
          : isUsed
            ? "cursor-not-allowed border-neutral-200 text-neutral-300 line-through dark:border-neutral-800 dark:text-neutral-600"
            : "border-neutral-300 hover:border-accent dark:border-neutral-700"
      }`}
    >
      <span aria-hidden="true">{t.flag}</span>
      <span>{t.fr}</span>
    </button>
  );
}
