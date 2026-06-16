"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ANNOUNCEMENTS, type Announcement } from "@/data/announcements";

/**
 * Popup « Quoi de neuf » : au retour d'un joueur connecté, présente en carrousel
 * les nouveautés qu'il n'a pas encore vues (1 par slide). Les annonces vues sont
 * mémorisées (localStorage par utilisateur) → plus jamais remontrées.
 */
export function WhatsNew({ userId, username }: { userId: string; username?: string }) {
  const router = useRouter();
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    const key = `whatsnew:${userId}`;
    let seen: string[] = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) seen = JSON.parse(raw);
    } catch {
      seen = [];
    }
    const unseen = ANNOUNCEMENTS.filter((a) => !seen.includes(a.id));
    if (unseen.length > 0) setQueue(unseen);
  }, [userId]);

  if (queue.length === 0) return null;

  const close = () => {
    try {
      const key = `whatsnew:${userId}`;
      const raw = localStorage.getItem(key);
      const seen: string[] = raw ? JSON.parse(raw) : [];
      const merged = Array.from(new Set([...seen, ...ANNOUNCEMENTS.map((a) => a.id)]));
      localStorage.setItem(key, JSON.stringify(merged));
    } catch {
      /* ignore */
    }
    setQueue([]);
  };

  const a = queue[i];
  const last = i >= queue.length - 1;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md animate-fade-in rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">
              {username ? `Quoi de neuf ${username}` : "Quoi de neuf"} 👋
            </h2>
            <p className="text-sm text-neutral-500">{"Voici ce qu'on a ajouté."}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>

        <div className="my-6 text-center">
          <div className="text-6xl" aria-hidden="true">
            {a.emoji}
          </div>
          <h3 className="mt-3 text-xl font-bold">{a.title}</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-neutral-500">{a.description}</p>
        </div>

        {/* Points de progression */}
        <div className="mb-4 flex justify-center gap-1.5">
          {queue.map((q, idx) => (
            <span
              key={q.id}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-5 bg-accent" : "w-1.5 bg-neutral-300 dark:bg-neutral-700"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="min-h-tap rounded-full px-4 text-sm font-medium text-neutral-500 disabled:opacity-0"
          >
            ← Précédent
          </button>
          <button
            type="button"
            onClick={() => {
              if (a.href) {
                close();
                router.push(a.href);
              } else if (last) {
                close();
              } else {
                setI((v) => v + 1);
              }
            }}
            className="min-h-tap rounded-full bg-accent px-6 font-semibold text-white transition active:scale-95"
          >
            {a.href ? a.cta ?? "Découvrir →" : last ? "C'est parti !" : "Suivant →"}
          </button>
        </div>
      </div>
    </div>
  );
}
