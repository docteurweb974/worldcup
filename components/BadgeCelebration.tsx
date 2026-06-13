"use client";

import { useEffect, useState } from "react";
import { Confetti, playCheer } from "./Confetti";

export interface CelebratedBadge {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

/**
 * Affiche une animation de célébration pour les badges nouvellement débloqués.
 * Mémorise les badges déjà vus dans localStorage (par utilisateur) : au tout
 * premier chargement on enregistre la base SANS célébrer (pas de rejeu de
 * l'historique), ensuite seuls les nouveaux badges déclenchent l'animation.
 */
export function BadgeCelebration({ userId, earned }: { userId: string; earned: CelebratedBadge[] }) {
  const [queue, setQueue] = useState<CelebratedBadge[]>([]);
  const [idx, setIdx] = useState(0);
  const [shownIn, setShownIn] = useState(false);
  const [fireKey, setFireKey] = useState(0);

  useEffect(() => {
    const key = `seenBadges:${userId}`;
    const earnedIds = earned.map((b) => b.id);

    let seen: string[] | null = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) seen = JSON.parse(raw);
    } catch {
      seen = null;
    }

    if (Array.isArray(seen)) {
      const fresh = earned.filter((b) => !seen!.includes(b.id));
      if (fresh.length > 0) {
        setQueue(fresh);
        setIdx(0);
        setFireKey((k) => k + 1);
        playCheer();
      }
    }
    // On (re)pose la base des badges vus.
    try {
      localStorage.setItem(key, JSON.stringify(earnedIds));
    } catch {
      /* localStorage indisponible : on ignore */
    }
  }, [userId, earned]);

  useEffect(() => {
    if (queue.length === 0) return;
    setShownIn(false);
    const t = setTimeout(() => setShownIn(true), 10);
    return () => clearTimeout(t);
  }, [idx, queue.length]);

  if (queue.length === 0) return null;
  const badge = queue[idx];
  const last = idx >= queue.length - 1;

  const next = () => {
    if (last) {
      setQueue([]);
    } else {
      setIdx((i) => i + 1);
      setFireKey((k) => k + 1);
      playCheer();
    }
  };

  return (
    <>
      <Confetti fireKey={fireKey} />
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
        <div
          className={`rounded-3xl bg-white p-8 text-center shadow-2xl transition-all duration-500 dark:bg-neutral-900 ${
            shownIn ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        >
          <div className="mx-auto mb-3 grid h-24 w-24 place-items-center rounded-full bg-accent-soft text-5xl shadow-[0_0_40px_rgba(99,102,241,0.5)]">
            {badge.emoji}
          </div>
          <p className="text-sm font-medium uppercase tracking-wide text-accent">Badge débloqué !</p>
          <p className="mt-1 text-xl font-bold">{badge.title}</p>
          <p className="mt-1 text-sm text-neutral-500">{badge.description}</p>
          {queue.length > 1 && (
            <p className="mt-2 text-xs text-neutral-400">
              {idx + 1} / {queue.length}
            </p>
          )}
          <button
            type="button"
            onClick={next}
            className="mt-5 min-h-tap rounded-full bg-accent px-6 font-semibold text-white transition active:scale-95"
          >
            {last ? "Génial !" : "Suivant"}
          </button>
        </div>
      </div>
    </>
  );
}
