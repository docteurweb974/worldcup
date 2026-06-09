"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePreferences } from "./PreferencesProvider";
import { formatFull } from "@/lib/timezone";
import { TEAM_BY_TLA } from "@/data/teams";

/** Match allégé pour le client (le détail complet reste côté serveur). */
export interface SlimMatch {
  id: number;
  utcDate: string;
  homeTla: string | null;
  awayTla: string | null;
}

const label = (tla: string | null) => {
  const t = tla ? TEAM_BY_TLA[tla] : undefined;
  return t ? `${t.flag} ${t.nameFr}` : "À déterminer";
};

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({ matches }: { matches: SlimMatch[] }) {
  const { favorites, timezone, hydrated } = usePreferences();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fav = useMemo(() => new Set(favorites), [favorites]);
  const next = useMemo(() => {
    return matches
      .filter((m) => new Date(m.utcDate).getTime() > now)
      .filter(
        (m) =>
          (m.homeTla && fav.has(m.homeTla)) || (m.awayTla && fav.has(m.awayTla)),
      )
      .sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate))[0];
  }, [matches, fav, now]);

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />;
  }

  if (favorites.length === 0) {
    return (
      <Link
        href="/equipes"
        className="block rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700"
      >
        <p className="font-medium">Choisis ton zékip ⭐</p>
        <p className="mt-1 text-sm text-neutral-500">
          Sélectionne tes équipes favorites pour voir le compte à rebours.
        </p>
      </Link>
    );
  }

  if (!next) {
    return (
      <div className="rounded-2xl border border-neutral-200 p-6 text-center dark:border-neutral-800">
        <p className="font-medium">Aucun match à venir pour tes équipes 🏁</p>
      </div>
    );
  }

  const diff = Math.max(0, new Date(next.utcDate).getTime() - now);
  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  const units: [number, string][] = [
    [days, "j"],
    [hours, "h"],
    [mins, "min"],
    [secs, "s"],
  ];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-accent-soft/40 p-6 text-center dark:border-neutral-800">
      <p className="text-sm text-neutral-500">Prochain match</p>
      <p className="mt-1 text-lg font-bold">
        {label(next.homeTla)} <span className="text-neutral-400">vs</span>{" "}
        {label(next.awayTla)}
      </p>
      <p className="mt-1 text-sm text-neutral-500">{formatFull(next.utcDate, timezone)}</p>
      <div className="mt-4 flex justify-center gap-3" aria-label="Temps restant">
        {units.map(([v, u]) => (
          <div key={u} className="min-w-14 rounded-xl bg-white px-2 py-2 dark:bg-neutral-900">
            <div className="text-2xl font-bold tabular-nums text-accent">{pad(v)}</div>
            <div className="text-xs text-neutral-500">{u}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
