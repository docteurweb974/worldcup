"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Rafraîchit le classement UNIQUEMENT quand un match passe « terminé »
 * (donc quand les points changent). Le reste du temps il ne poll pas :
 *  - tant qu'un match est en cours, il vérifie le statut toutes les 45 s ;
 *  - sinon, il dort jusqu'au prochain coup d'envoi (au plus 15 min).
 */
export function LivePointsRefresher() {
  const router = useRouter();
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let baseline: number | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    async function tick() {
      let data: { finishedCount: number; active: boolean; nextKickoffMs: number | null };
      try {
        const res = await fetch("/api/match-status", { cache: "no-store" });
        data = await res.json();
      } catch {
        if (!stopped) timer = setTimeout(tick, 60_000);
        return;
      }
      if (stopped) return;

      if (baseline === null) {
        baseline = data.finishedCount;
      } else if (data.finishedCount > baseline) {
        // Un (ou plusieurs) match vient de se terminer → on met à jour les points.
        baseline = data.finishedCount;
        router.refresh();
        setUpdated(true);
        setTimeout(() => setUpdated(false), 6000);
      }

      const now = Date.now();
      let delay: number;
      if (data.active) {
        delay = 45_000;
      } else if (data.nextKickoffMs) {
        delay = Math.min(Math.max(data.nextKickoffMs - now, 60_000), 15 * 60_000);
      } else {
        delay = 15 * 60_000;
      }
      timer = setTimeout(tick, delay);
    }

    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [router]);

  if (!updated) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-50 mx-auto w-fit animate-fade-in rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg"
    >
      ⚽ Classement mis à jour
    </div>
  );
}
